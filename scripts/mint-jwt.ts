import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importPKCS8, SignJWT } from 'jose';
import type { Perfil } from '../packages/shared/src/index';

const perfil = (process.argv[2] ?? 'passageiro') as Perfil;
const subs: Record<Perfil, string> = {
  passageiro: 'passageiro-ana',
  motorista: 'motorista-joao',
};

const privateKeyPath = join(import.meta.dir, '..', 'keys', 'test-private.pem');
const privateKey = readFileSync(privateKeyPath, 'utf8');
const key = await importPKCS8(privateKey, 'RS256');

const now = Math.floor(Date.now() / 1000);
const sub = subs[perfil] ?? subs.passageiro;
const exp = now + 60 * 60 * 24 * 30;

const token = await new SignJWT({ perfil })
  .setProtectedHeader({ alg: 'RS256' })
  .setSubject(sub)
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .setIssuer('taxi-rio-test')
  .setAudience('taxi-rio-api')
  .sign(key);

console.log(token);
