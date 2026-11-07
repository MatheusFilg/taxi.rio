import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('../../../', import.meta.url)));
import { importPKCS8, SignJWT } from 'jose';
import { buildApp } from './app.js';

async function tokenFor(
  perfil: 'passageiro' | 'motorista',
  sub: string,
): Promise<string> {
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

describe('corridas auth', () => {
  it('POST /corridas sem token retorna 401', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/corridas',
      payload: { origem: 'A', destino: 'B' },
      headers: { 'idempotency-key': '00000000-0000-4000-8000-000000000001' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('POST /corridas como motorista retorna 403', async () => {
    const app = await buildApp();
    const token = await tokenFor('motorista', 'motorista-joao');
    const res = await app.inject({
      method: 'POST',
      url: '/corridas',
      payload: { origem: 'A', destino: 'B' },
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': '00000000-0000-4000-8000-000000000002',
      },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
