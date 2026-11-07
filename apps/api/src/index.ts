import Fastify from 'fastify';
import { RABBIT, renderPrometheusMetrics } from '@taxi/shared';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'ok',
  service: 'api',
  rabbit: RABBIT.exchange,
}));

app.get('/metrics', async (_req, reply) => {
  return reply
    .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    .send(renderPrometheusMetrics('api'));
});

app.get('/', async () => ({
  message: 'Taxi.Rio API — Parte 1 (compose fundação)',
  docs: 'DECISIONS.md',
}));

const start = async () => {
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
