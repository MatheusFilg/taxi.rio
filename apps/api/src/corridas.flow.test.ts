import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importPKCS8, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { buildApp } from './app.js';

const run = process.env.INTEGRATION === '1';

async function tokenFor(
  perfil: 'passageiro' | 'motorista',
  sub: string,
): Promise<string> {
  const repoRoot = join(fileURLToPath(new URL('../../../', import.meta.url)));
  const keyPath = join(repoRoot, 'keys', 'test-private.pem');
  const privateKey = readFileSync(keyPath, 'utf8');
  const key = await importPKCS8(privateKey, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ perfil })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(sub)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer('taxi-rio-test')
    .setAudience('taxi-rio-api')
    .sign(key);
}

(run ? describe : describe.skip)('corridas integration', () => {
  it('POST feliz + idempotency replay', async () => {
    const app = await buildApp();
    const token = await tokenFor('passageiro', 'passageiro-ana');
    const key = randomUUID();
    const headers = {
      authorization: `Bearer ${token}`,
      'idempotency-key': key,
    };
    const payload = { origem: 'A', destino: 'B' };
    const r1 = await app.inject({
      method: 'POST',
      url: '/corridas',
      payload,
      headers,
    });
    expect(r1.statusCode).toBe(201);
    const body1 = r1.json() as { id: number };
    const r2 = await app.inject({
      method: 'POST',
      url: '/corridas',
      payload: { origem: 'X', destino: 'Y' },
      headers,
    });
    expect(r2.statusCode).toBe(200);
    const body2 = r2.json() as { id: number };
    expect(body2.id).toBe(body1.id);
    await app.close();
  });
});
