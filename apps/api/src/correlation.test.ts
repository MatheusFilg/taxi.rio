import { describe, expect, it } from 'bun:test';
import { PassThrough } from 'node:stream';
import { RABBIT } from '@taxi/shared';
import { buildApp } from './app.js';
import { correlationIdFromHeader } from './correlation.js';
import { buildCorridaEnvelope } from './rabbit.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function collectLogs(stream: PassThrough): Record<string, unknown>[] {
  const raw: unknown = stream.read();
  const text = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  return text
    .split('\n')
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line) as Record<string, unknown>);
}

describe('correlation', () => {
  it('reusa x-correlation-id e grava no log JSON', async () => {
    const stream = new PassThrough();
    const app = await buildApp({ logDestination: stream });
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'test-123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-correlation-id']).toBe('test-123');
    await app.close();
    const logs = collectLogs(stream);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every((line) => line.correlation_id === 'test-123')).toBe(true);
    expect(logs.every((line) => line.trace_id === null)).toBe(true);
    expect(typeof logs[0]?.msg).toBe('string');
  });

  it('gera UUID quando o header falta e ecoa na resposta', async () => {
    const stream = new PassThrough();
    const app = await buildApp({ logDestination: stream });
    const res = await app.inject({ method: 'GET', url: '/health' });
    const id = res.headers['x-correlation-id'];
    expect(typeof id).toBe('string');
    expect(id).toMatch(UUID);
    await app.close();
    const logs = collectLogs(stream);
    expect(logs.every((line) => line.correlation_id === id)).toBe(true);
  });

  it('ignora header vazio', () => {
    expect(correlationIdFromHeader('')).toMatch(UUID);
    expect(correlationIdFromHeader('   ')).toMatch(UUID);
    expect(correlationIdFromHeader('  test-123  ')).toBe('test-123');
  });

  it('coloca correlation_id no envelope Rabbit', () => {
    const envelope = buildCorridaEnvelope(
      RABBIT.routing.corridaCriada,
      { corrida_id: 1 },
      'test-123',
      'evt-1',
      '2026-11-08T00:00:00.000Z',
    );
    expect(envelope).toEqual({
      event: 'corrida.criada',
      event_id: 'evt-1',
      correlation_id: 'test-123',
      occurred_at: '2026-11-08T00:00:00.000Z',
      payload: { corrida_id: 1 },
    });
  });
});
