import {
  context,
  propagation,
  trace,
  SpanKind,
  SpanStatusCode,
  type Context,
  type Span,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { RABBIT } from '@taxi/shared';
import {
  BatchSpanProcessor,
  NodeTracerProvider,
  SimpleSpanProcessor,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { LogController, type FastifyReply, type FastifyRequest } from 'fastify';

type TracedRequest = FastifyRequest & {
  otelSpan?: Span;
  otelContext?: Context;
};

let started = false;
let activeProvider: NodeTracerProvider | undefined;

/** Permite re-inicializar o provider em testes (InMemorySpanExporter). */
export function resetTracingForTest(): void {
  started = false;
}

export function tracingEnabled(): boolean {
  return started;
}

/** URL HTTP OTLP (/v1/traces) usada pelo exporter no bundle Bun. */
export function otlpEndpoint(): string | undefined {
  const raw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!raw) return undefined;
  let url = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `http://${raw}`;
  if (url.includes('/v1/traces')) return url;
  if (/:4317\/?$/.test(url)) {
    return url.replace(/:4317\/?$/, ':4318/v1/traces');
  }
  return `${url.replace(/\/$/, '')}/v1/traces`;
}

export function startTracing(options?: { exporter?: SpanExporter }): void {
  if (started && !options?.exporter) return;
  if (started && options?.exporter) started = false;
  const endpoint = otlpEndpoint();
  const exporter =
    options?.exporter ??
    (endpoint ? new OTLPTraceExporter({ url: endpoint }) : undefined);
  if (!exporter) return;
  const serviceName = process.env.OTEL_SERVICE_NAME?.trim() || 'api';
  process.env.OTEL_SERVICE_NAME = serviceName;
  const processor = options?.exporter
    ? new SimpleSpanProcessor(exporter)
    : new BatchSpanProcessor(exporter);
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ 'service.name': serviceName }),
    spanProcessors: [processor],
  });
  void activeProvider?.shutdown().catch(() => undefined);
  activeProvider = provider;
  provider.register({ propagator: new W3CTraceContextPropagator() });
  started = true;
}

function apiTracer() {
  return trace.getTracer('api');
}

export class ApiLogController extends LogController {
  incomingRequest(request: FastifyRequest, reply: FastifyReply): void {
    if (started) {
      const span = apiTracer().startSpan(`${request.method} ${request.routeOptions?.url ?? request.url}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'http.request.method': request.method,
          'url.path': request.url,
        },
      });
      const ctx = trace.setSpan(context.active(), span);
      const traced = request as TracedRequest;
      traced.otelSpan = span;
      traced.otelContext = ctx;
      const child = request.log.child({
        trace_id: span.spanContext().traceId,
      });
      request.log = child;
      reply.log = child;
    }
    super.incomingRequest(request, reply);
  }

  requestCompleted(
    error: Error | null | undefined,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    super.requestCompleted(error, request, reply);
    const span = (request as TracedRequest).otelSpan;
    if (!span) return;
    if (error || reply.statusCode >= 500) {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    span.end();
  }
}

export function bindRequestContext(
  request: FastifyRequest,
  done: (err?: Error) => void,
): void {
  const ctx = (request as TracedRequest).otelContext;
  if (!ctx) {
    done();
    return;
  }
  context.with(ctx, done);
}

export async function withPublishSpan<T>(
  routingKey: string,
  fn: (headers: Record<string, string>) => Promise<T>,
): Promise<T> {
  if (!started) return fn({});
  return apiTracer().startActiveSpan(
    `publish ${routingKey}`,
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.destination.name': RABBIT.exchange,
        'messaging.rabbitmq.routing_key': routingKey,
      },
    },
    async (span) => {
      try {
        const headers: Record<string, string> = {};
        propagation.inject(context.active(), headers);
        return await fn(headers);
      } catch (err) {
        span.recordException(
          err instanceof Error ? err : new Error(String(err)),
        );
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      } finally {
        span.end();
      }
    },
  );
}
