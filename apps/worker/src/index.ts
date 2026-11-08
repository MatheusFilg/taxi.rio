import amqp from 'amqplib';
import Redis from 'ioredis';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { RABBIT } from '@taxi/shared';
import {
  getWorkerMetricsText,
  messageProcessingDurationSeconds,
  messagesFailedTotal,
  messagesProcessedTotal,
} from './metrics.js';
import { correlationIdFromBody, logWorker } from './log.js';
import { startTracing, traceCarrierFromHeaders, withConsumeSpan } from './tracing.js';
import {
  handleMessage,
  MAX_RETRIES,
  nextRetryCount,
  retryCount,
} from './process.js';

startTracing();

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const rabbitUrl =
  process.env.RABBITMQ_URL ?? 'amqp://taxi:taxi@localhost:5672';
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/taxi_audit';

async function waitForRabbit() {
  for (let i = 0; i < 30; i++) {
    try {
      return await amqp.connect(rabbitUrl);
    } catch {
      await Bun.sleep(2000);
    }
  }
  throw new Error('RabbitMQ indisponível');
}

async function main() {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'taxi',
    password: process.env.MYSQL_PASSWORD ?? 'taxi',
    database: process.env.MYSQL_DATABASE ?? 'taxi',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongo = mongoClient.db();

  const server = Bun.serve({
    port,
    hostname: host,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/health') {
        return Response.json({
          status: 'ok',
          service: 'worker',
          queue: RABBIT.workerQueue,
        });
      }
      if (url.pathname === '/metrics') {
        return new Response(await getWorkerMetricsText(), {
          headers: {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          },
        });
      }
      return new Response('Taxi.Rio Worker', { status: 200 });
    },
  });

  logWorker('info', `health escutando em http://${host}:${port}/health`);

  const conn = await waitForRabbit();
  const ch = await conn.createChannel();

  await ch.assertExchange(RABBIT.dlx, 'direct', { durable: true });
  await ch.assertQueue(RABBIT.dlq, { durable: true });
  await ch.bindQueue(RABBIT.dlq, RABBIT.dlx, RABBIT.dlq);

  await ch.assertExchange(RABBIT.exchange, 'direct', { durable: true });
  await ch.assertQueue(RABBIT.workerQueue, {
    durable: true,
    deadLetterExchange: RABBIT.dlx,
    deadLetterRoutingKey: RABBIT.dlq,
  });
  await ch.bindQueue(
    RABBIT.workerQueue,
    RABBIT.exchange,
    RABBIT.routing.corridaCriada,
  );
  await ch.bindQueue(
    RABBIT.workerQueue,
    RABBIT.exchange,
    RABBIT.routing.statusAlterado,
  );
  await ch.prefetch(1);

  logWorker('info', `aguardando mensagens em ${RABBIT.workerQueue}`);

  await ch.consume(
    RABBIT.workerQueue,
    async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;
      const rk = msg.fields.routingKey;
      const carrier = traceCarrierFromHeaders(
        msg.properties.headers as Record<string, unknown> | undefined,
      );
      await withConsumeSpan(rk, carrier, async () => {
        const endTimer = messageProcessingDurationSeconds.startTimer({
          event: rk,
        });
        try {
          await handleMessage(msg, { redis, pool, mongo });
          messagesProcessedTotal.inc({ event: rk });
          ch.ack(msg);
        } catch (err) {
          logWorker('error', 'falha ao processar', {
            correlation_id: correlationIdFromBody(msg.content.toString()),
            routing_key: rk,
            err: err instanceof Error ? err.message : String(err),
          });
          const retries = retryCount(msg);
          if (retries < MAX_RETRIES) {
            const count = nextRetryCount(msg);
            ch.nack(msg, false, false);
            ch.publish(
              RABBIT.exchange,
              rk,
              msg.content,
              {
                persistent: true,
                headers: {
                  ...(msg.properties.headers ?? {}),
                  'x-retry-count': count,
                },
                contentType: 'application/json',
              },
            );
          } else {
            messagesFailedTotal.inc({ event: rk });
            ch.nack(msg, false, false);
          }
        } finally {
          endTimer();
        }
      });
    },
    { noAck: false },
  );

  process.on('SIGTERM', async () => {
    server.stop();
    await ch.close();
    await conn.close();
    redis.disconnect();
    await mongoClient.close();
    await pool.end();
    process.exit(0);
  });
}

main().catch((err) => {
  logWorker('error', 'worker encerrou', {
    err: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
