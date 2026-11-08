import { describe, expect, it } from 'bun:test';
import { context, propagation, trace } from '@opentelemetry/api';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';
import { logWorker } from './log.js';
import { startTracing, traceCarrierFromHeaders, withConsumeSpan } from './tracing.js';

const TRACE_ID = /^[0-9a-f]{32}$/;

describe('otel worker', () => {
  it('extrai traceparent do Rabbit e grava trace_id no log', async () => {
    const memory = new InMemorySpanExporter();
    startTracing({ exporter: memory });
    const tracer = trace.getTracer('test');
    await tracer.startActiveSpan('api publish', async (parent) => {
      const injected: Record<string, string> = {};
      propagation.inject(context.active(), injected);
      const carrier = traceCarrierFromHeaders({
        traceparent: Buffer.from(injected.traceparent),
      });
      const lines: string[] = [];
      const original = console.log;
      console.log = (msg?: unknown) => {
        lines.push(String(msg));
      };
      try {
        await withConsumeSpan('corrida.criada', carrier, async () => {
          logWorker('info', 'mensagem recebida', { correlation_id: 'test-123' });
        });
      } finally {
        console.log = original;
        parent.end();
      }
      const traceId = parent.spanContext().traceId;
      expect(traceId).toMatch(TRACE_ID);
      expect(carrier.traceparent?.slice(3, 35)).toBe(traceId);
      const parsed = JSON.parse(lines[0]) as { trace_id: string };
      expect(parsed.trace_id).toBe(traceId);
      const consumer = memory
        .getFinishedSpans()
        .find((span) => span.name === 'process corrida.criada');
      expect(consumer?.spanContext().traceId).toBe(traceId);
      expect(consumer?.parentSpanContext?.spanId).toBe(parent.spanContext().spanId);
    });
  });
});
