import { describe, expect, it } from 'bun:test';
import Fastify from 'fastify';

describe('health', () => {
  it('retorna ok', async () => {
    const app = Fastify();
    app.get('/health', async () => ({ status: 'ok', service: 'api' }));
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', service: 'api' });
    await app.close();
  });
});
