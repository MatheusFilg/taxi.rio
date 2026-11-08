import { describe, expect, it } from 'bun:test';
import { buildApp } from './app.js';

describe('metrics HTTP prom-client', () => {
  it('expõe http_requests_total e taxi_up após tráfego', async () => {
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/health' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(body).toContain('http_requests_total');
    expect(body).toContain('http_request_duration_seconds');
    expect(body).toContain('taxi_up 1');
    expect(body).toMatch(/status_code="200"/);
    await app.close();
  });
});
