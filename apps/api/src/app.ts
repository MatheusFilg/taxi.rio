import Fastify, { type FastifyServerOptions } from 'fastify';
import { RABBIT } from '@taxi/shared';
import { getApiMetricsText, registerHttpMetrics } from './metrics.js';
import { registerAuth } from './auth.js';
import {
  CORRELATION_HEADER,
  correlationIdFromHeader,
  registerCorrelation,
} from './correlation.js';
import { corridaRoutes } from './routes/corridas.js';
import { ApiLogController, bindRequestContext, tracingEnabled } from './tracing.js';

type LoggerConfig = Exclude<NonNullable<FastifyServerOptions['logger']>, boolean>;

export type BuildAppOptions = {
  logDestination?: LoggerConfig['stream'];
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: 'info',
      ...(options.logDestination ? { stream: options.logDestination } : {}),
    },
    genReqId(req) {
      return correlationIdFromHeader(req.headers[CORRELATION_HEADER]);
    },
    logController: new ApiLogController({ requestIdLogLabel: 'correlation_id' }),
    childLoggerFactory(logger, bindings, opts) {
      const extra = tracingEnabled() ? {} : { trace_id: null };
      return logger.child({ ...extra, ...bindings }, opts);
    },
  });

  registerCorrelation(app);
  app.addHook('onRequest', (request, _reply, done) => {
    bindRequestContext(request, done);
  });
  registerHttpMetrics(app);
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
      .send(await getApiMetricsText());
  });

  app.get('/', async () => ({
    message: 'Taxi.Rio API — Parte 1',
    routes: ['POST /corridas', 'PATCH /corridas/:id/status', 'GET /corridas/:id'],
  }));

  return app;
}