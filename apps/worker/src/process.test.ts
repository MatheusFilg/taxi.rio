import { describe, expect, it } from 'bun:test';
import type { ConsumeMessage } from 'amqplib';
import { MAX_RETRIES, nextRetryCount, retryCount } from './process.js';

function msg(headers: Record<string, number | undefined>): ConsumeMessage {
  return {
    content: Buffer.from('{}'),
    fields: { routingKey: 'corrida.criada', deliveryTag: 1, exchange: '', redelivered: false },
    properties: {
      headers,
      contentType: 'application/json',
    },
  } as ConsumeMessage;
}

describe('worker process helpers', () => {
  it('retryCount lê x-retry-count', () => {
    expect(retryCount(msg({ 'x-retry-count': 2 }))).toBe(2);
    expect(retryCount(msg({}))).toBe(0);
  });

  it('MAX_RETRIES é 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });

  it('nextRetryCount incrementa', () => {
    expect(nextRetryCount(msg({ 'x-retry-count': 1 }))).toBe(2);
  });
});
