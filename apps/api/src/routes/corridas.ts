import type { FastifyInstance } from 'fastify';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import {
  RABBIT,
  type CorridaCriadaPayload,
  type CorridaStatus,
  type CorridaStatusAlteradoPayload,
} from '@taxi/shared';
import { randomUUID } from 'node:crypto';
import {
  getPerfil,
  requireAuth,
  requireMotorista,
  requirePassageiro,
} from '../auth.js';
import { getPool, rowToJson, type CorridaRow } from '../db.js';
import { getCorridaFromCache, invalidateCorridaCache } from '../redis.js';
import { publishCorridaEvent } from '../rabbit.js';

const VALID_STATUS: CorridaStatus[] = [
  'SOLICITADA',
  'ACEITA',
  'EM_ANDAMENTO',
  'FINALIZADA',
  'CANCELADA',
];

function correlationId(request: { headers: Record<string, unknown> }): string {
  const h = request.headers['x-correlation-id'];
  return typeof h === 'string' && h.length > 0 ? h : randomUUID();
}

export async function corridaRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/corridas',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!requirePassageiro(request, reply)) return;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
        return reply.code(400).send({ error: 'Idempotency-Key obrigatório' });
      }
      const body = request.body as { origem?: string; destino?: string };
      if (!body?.origem?.trim() || !body?.destino?.trim()) {
        return reply.code(400).send({ error: 'origem e destino obrigatórios' });
      }
      const passageiroId = request.user.sub;
      const pool = getPool();
      const [idemRows] = await pool.query<RowDataPacket[]>(
        'SELECT response_json FROM corridas_idempotencia WHERE idempotency_key = ? AND passageiro_id = ?',
        [idempotencyKey, passageiroId],
      );
      if (idemRows.length > 0) {
        const stored = idemRows[0].response_json;
        const parsed =
          typeof stored === 'string' ? JSON.parse(stored) : stored;
        return reply.code(200).send(parsed);
      }
      const status: CorridaStatus = 'SOLICITADA';
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO corridas (passageiro_id, origem, destino, status) VALUES (?, ?, ?, ?)',
        [passageiroId, body.origem.trim(), body.destino.trim(), status],
      );
      const corridaId = result.insertId;
      const responseBody = {
        id: corridaId,
        passageiro_id: passageiroId,
        origem: body.origem.trim(),
        destino: body.destino.trim(),
        status,
      };
      await pool.query(
        'INSERT INTO corridas_idempotencia (idempotency_key, passageiro_id, corrida_id, response_json) VALUES (?, ?, ?, ?)',
        [
          idempotencyKey,
          passageiroId,
          corridaId,
          JSON.stringify(responseBody),
        ],
      );
      const corrId = correlationId(request);
      const payload: CorridaCriadaPayload = {
        corrida_id: corridaId,
        passageiro_id: passageiroId,
        status,
        origem: responseBody.origem,
        destino: responseBody.destino,
      };
      await publishCorridaEvent(
        RABBIT.routing.corridaCriada,
        payload,
        corrId,
      );
      return reply.code(201).send(responseBody);
    },
  );

  app.patch(
    '/corridas/:id/status',
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!requireMotorista(request, reply)) return;
      const id = Number((request.params as { id: string }).id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: 'id inválido' });
      }
      const body = request.body as { status?: string };
      if (!body?.status || !VALID_STATUS.includes(body.status as CorridaStatus)) {
        return reply.code(400).send({ error: 'status inválido' });
      }
      const status = body.status as CorridaStatus;
      const pool = getPool();
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM corridas WHERE id = ?',
        [id],
      );
      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Corrida não encontrada' });
      }
      await pool.query('UPDATE corridas SET status = ? WHERE id = ?', [
        status,
        id,
      ]);
      await invalidateCorridaCache(id);
      const corrId = correlationId(request);
      const payload: CorridaStatusAlteradoPayload = {
        corrida_id: id,
        status,
      };
      await publishCorridaEvent(
        RABBIT.routing.statusAlterado,
        payload,
        corrId,
      );
      return reply.code(200).send({ id, status });
    },
  );

  app.get(
    '/corridas/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: 'id inválido' });
      }
      const perfil = getPerfil(request);
      const cached = await getCorridaFromCache(id);
      if (cached) {
        if (
          perfil === 'passageiro' &&
          cached.passageiro_id !== request.user.sub
        ) {
          return reply.code(403).send({ error: 'Forbidden' });
        }
        return reply.send(cached);
      }
      const pool = getPool();
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, passageiro_id, origem, destino, status, created_at, updated_at FROM corridas WHERE id = ?',
        [id],
      );
      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Corrida não encontrada' });
      }
      const row = rows[0] as unknown as CorridaRow;
      if (perfil === 'passageiro' && row.passageiro_id !== request.user.sub) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      return reply.send(rowToJson(row));
    },
  );
}
