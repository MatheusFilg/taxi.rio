import amqp from 'amqplib';
import Redis from 'ioredis';
import { RABBIT } from '@taxi/shared';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const rabbitUrl =
  process.env.RABBITMQ_URL ?? 'amqp://taxi:taxi@localhost:5672';
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function waitForRabbit(): Promise<amqp.Connection> {
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

  const server = Bun.serve({
    port,
    hostname: host,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/health') {
        return Response.json({
          status: 'ok',
          service: 'worker',
          queue: RABBIT.workerQueue,
        });
      }
      return new Response('Taxi.Rio Worker', { status: 200 });
    },
  });

  console.log(`Worker health on http://${host}:${port}/health`);

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

  console.log(`Aguardando mensagens em ${RABBIT.workerQueue}…`);

  await ch.consume(
    RABBIT.workerQueue,
    (msg) => {
      if (!msg) return;
      console.log(`[worker] recebido`, msg.fields.routingKey);
      // Parte 1: stub — próximo card processa Redis/Mongo
      ch.ack(msg);
    },
    { noAck: false },
  );

  process.on('SIGTERM', async () => {
    server.stop();
    await ch.close();
    await conn.close();
    redis.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
