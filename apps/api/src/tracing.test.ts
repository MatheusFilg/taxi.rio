import { beforeEach, describe, expect, it } from 'bun:test';
import { trace } from '@opentelemetry/api';
import { PassThrough } from 'node:stream';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';
import { buildApp } from './app.js';
import { resetTracingForTest, startTracing, withPublishSpan } from './tracing.js';

const TRACE_ID = /^[0-9a-f]{32}$/;

function collectLogs(stream: PassThrough): Record<string, unknown>[] {
  const raw: unknown = stream.read();
  const text = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  return text
    .split('\n')
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line) as Record<string, unknown>);
}

describe('otel', () => {
  beforeEach(async () => {
    resetTracingForTest();
    const tp = trace.getTracerProvider() as { shutdown?: () => Promise<void> };
    if (typeof tp.shutdown === 'function') await tp.shutdown();
  });

  it('grava trace_id no log e abre span de publish', async () => {
    resetTracingForTest();
    const memory = new InMemorySpanExporter();
    startTracing({ exporter: memory });
    const stream = new PassThrough();
    const app = await buildApp({ logDestination: stream });
    app.get('/_otel', async (request) => {
      let traceparent = '';
      await withPublishSpan('corrida.criada', async (headers) => {
        traceparent = headers.traceparent ?? '';
      });
      request.log.info('publish ok');
      return { traceparent };
    });
    const res = await app.inject({ method: 'GET', url: '/_otel' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { traceparent: string };
    expect(body.traceparent.startsWith('00-')).toBe(true);
    await app.close();
    const logs = collectLogs(stream);
    const traceId = body.traceparent.slice(3, 35);
    expect(traceId).toMatch(TRACE_ID);
    expect(logs.some((line) => line.trace_id === traceId)).toBe(true);
    const spans = memory.getFinishedSpans();
    const http = spans.find((span) => span.name === 'GET /_otel');
    const publish = spans.find((span) => span.name === 'publish corrida.criada');
    expect(http?.spanContext().traceId).toBe(traceId);
    expect(publish?.parentSpanContext?.spanId).toBe(http?.spanContext().spanId);
    expect(http?.resource.attributes['service.name']).toBe('api');
  });
});
