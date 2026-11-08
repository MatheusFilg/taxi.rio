import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import {
  API_HTTP_PROMETHEUS,
  attachTaxiServiceGauges,
  registryToPrometheusText,
} from '@taxi/shared';

const registry = new Registry();
collectDefaultMetrics({ register: registry });
attachTaxiServiceGauges(registry, 'api');

const httpRequestsTotal = new Counter({
  name: API_HTTP_PROMETHEUS.requestsTotalMetric,
  help: 'Total de requisições HTTP na API.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry],
});

const httpRequestDurationSeconds = new Histogram({
  name: API_HTTP_PROMETHEUS.requestDurationMetric,
  help: 'Duração das requisições HTTP na API (segundos).',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const metricsStartKey = Symbol('metricsStart');

function routeLabel(req: FastifyRequest): string {
  const fromRouter =
    req.routeOptions?.url ??
    (req as FastifyRequest & { routerPath?: string }).routerPath;
  if (fromRouter) return fromRouter;
  const path = req.url.split('?')[0];
  return path.length > 0 ? path : '/';
}

function observeHttp(
  req: FastifyRequest,
  reply: FastifyReply,
  started: bigint,
): void {
  const elapsedNs = process.hrtime.bigint() - started;
  const durationSec = Number(elapsedNs) / 1e9;
  const labels = {
    method: req.method,
    route: routeLabel(req),
    status_code: String(reply.statusCode),
  };
  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, durationSec);
}

export function registerHttpMetrics(app: FastifyInstance): void {
  app.addHook('onRequest', async (req) => {
    (req as FastifyRequest & { [metricsStartKey]?: bigint })[metricsStartKey] =
      process.hrtime.bigint();
  });

  app.addHook('onResponse', async (req, reply) => {
    const started = (req as FastifyRequest & { [metricsStartKey]?: bigint })[
      metricsStartKey
    ];
    if (started === undefined) return;
    observeHttp(req, reply, started);
  });
}

export async function getApiMetricsText(): Promise<string> {
  return registryToPrometheusText(registry);
}
