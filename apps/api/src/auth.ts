import fs from 'node:fs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import {
  canCreateCorrida,
  canPatchStatus,
  type Perfil,
} from '@taxi/shared';

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('../../../', import.meta.url)));

const keyPath =
  process.env.JWT_PUBLIC_KEY_PATH ?? join(repoRoot, 'keys', 'test-public.pem');

export async function registerAuth(app: FastifyInstance): Promise<void> {
  const publicKey = fs.readFileSync(keyPath, 'utf8');
  await app.register(fastifyJwt, {
    secret: { public: publicKey },
    verify: {
      algorithms: ['RS256'],
      issuer: 'taxi-rio-test',
      audience: 'taxi-rio-api',
    },
  });
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function getPerfil(request: FastifyRequest): Perfil {
  return request.user.perfil;
}

export function requirePassageiro(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (!canCreateCorrida(getPerfil(request))) {
    reply.code(403).send({ error: 'Forbidden', reason: 'perfil' });
    return false;
  }
  return true;
}

export function requireMotorista(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (!canPatchStatus(getPerfil(request))) {
    reply.code(403).send({ error: 'Forbidden', reason: 'perfil' });
    return false;
  }
  return true;
}
