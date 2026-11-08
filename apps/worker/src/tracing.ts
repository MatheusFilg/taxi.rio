import {
  context,
  propagation,
  trace,
  SpanKind,
  SpanStatusCode,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { RABBIT } from '@taxi/shared';
import {
  BatchSpanProcessor,
  NodeTracerProvider,
  SimpleSpanProcessor,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

let started = false;

export function tracingEnabled(): boolean {
  return started;
}

export function otlpEndpoint(): string | undefined {
  const raw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!raw) return undefined;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://${raw}`;
}

export function startTracing(options?: { exporter?: SpanExporter }): void {
  if (started) return;
  const endpoint = otlpEndpoint();
  const exporter =
    options?.exporter ??
    (endpoint ? new OTLPTraceExporter({ url: endpoint }) : undefined);
  if (!exporter) return;
  if (!process.env.OTEL_SERVICE_NAME) process.env.OTEL_SERVICE_NAME = 'worker';
  const processor = options?.exporter
    ? new SimpleSpanProcessor(exporter)
    : new BatchSpanProcessor(exporter);
  const provider = new NodeTracerProvider({
    spanProcessors: [processor],
  });
  provider.register({ propagator: new W3CTraceContextPropagator() });
  started = true;
}

function asHeaderString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
  return undefined;
}

export function traceCarrierFromHeaders(
  headers: Record<string, unknown> | undefined,
): Record<string, string> {
  const carrier: Record<string, string> = {};
  if (!headers) return carrier;
  for (const key of ['traceparent', 'tracestate']) {
    const value = asHeaderString(headers[key]);
    if (value) carrier[key] = value;
  }
  return carrier;
}

function workerTracer() {
  return trace.getTracer('worker');
}

export async function withConsumeSpan<T>(
  routingKey: string,
  headers: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  if (!started) return fn();
  const parent = propagation.extract(context.active(), headers);
  return workerTracer().startActiveSpan(
    `process ${routingKey}`,
    {
      kind: SpanKind.CONSUMER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.destination.name': RABBIT.workerQueue,
        'messaging.rabbitmq.routing_key': routingKey,
      },
    },
    parent,
    async (span) => {
      try {
        return await fn();
      } catch (err) {
        span.recordException(err instanceof Error ? err : new Error(String(err)));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      } finally {
        span.end();
      }
    },
  );
}
