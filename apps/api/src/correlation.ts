import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export const CORRELATION_HEADER = 'x-correlation-id';

export function correlationIdFromHeader(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length > 0 && trimmed.length <= 200) return trimmed;
  }
  return randomUUID();
}

export function registerCorrelation(app: FastifyInstance): void {
  app.addHook('onRequest', async (request, reply) => {
    reply.header(CORRELATION_HEADER, request.id);
  });
}
