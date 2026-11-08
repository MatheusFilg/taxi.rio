import { describe, expect, it } from 'bun:test';
import { correlationIdFromBody, workerLogLine } from './log.js';

describe('worker JSON logs', () => {
  it('lê correlation_id do envelope', () => {
    const raw = JSON.stringify({
      event: 'corrida.criada',
      event_id: 'evt-1',
      correlation_id: 'test-123',
    });
    expect(correlationIdFromBody(raw)).toBe('test-123');
    expect(correlationIdFromBody('não-json')).toBeNull();
    expect(correlationIdFromBody('{}')).toBeNull();
  });

  it('emite JSON com correlation_id e trace_id reservado', () => {
    const line = workerLogLine('info', 'mensagem recebida', {
      correlation_id: 'test-123',
      event_id: 'evt-1',
      event: 'corrida.criada',
    });
    const parsed = JSON.parse(line) as Record<string, string | null>;
    expect(parsed.service).toBe('worker');
    expect(parsed.correlation_id).toBe('test-123');
    expect(parsed.trace_id).toBeNull();
    expect(parsed.event_id).toBe('evt-1');
  });
});
