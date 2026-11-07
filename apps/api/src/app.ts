import Fastify from 'fastify';
import { RABBIT, renderPrometheusMetrics } from '@taxi/shared';
import { registerAuth } from './auth.js';
import { corridaRoutes } from './routes/corridas.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            correlation_id:
              (request.headers['x-correlation-id'] as string) ?? undefined,
          };
        },
      },
    },
  });

  await registerAuth(app);
  await app.register(corridaRoutes);

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
    message: 'Taxi.Rio API — Parte 1',
    routes: ['POST /corridas', 'PATCH /corridas/:id/status', 'GET /corridas/:id'],
  }));

  return app;
}
