import type { ConsumeMessage } from 'amqplib';
import type { Redis } from 'ioredis';
import type { Db } from 'mongodb';
import type mysql from 'mysql2/promise';
import {
  RABBIT,
  corridaRedisKey,
  type CorridaEventEnvelope,
  type CorridaCriadaPayload,
  type CorridaStatusAlteradoPayload,
} from '@taxi/shared';

const MAX_RETRIES = 3;

function parseEnvelope(
  msg: ConsumeMessage,
): CorridaEventEnvelope | null {
  try {
    return JSON.parse(msg.content.toString()) as CorridaEventEnvelope;
  } catch {
    return null;
  }
}

async function isProcessed(
  pool: mysql.Pool,
  eventId: string,
): Promise<boolean> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT event_id FROM processed_events WHERE event_id = ?',
    [eventId],
  );
  return rows.length > 0;
}

async function markProcessed(pool: mysql.Pool, eventId: string): Promise<void> {
  await pool.query('INSERT IGNORE INTO processed_events (event_id) VALUES (?)', [
    eventId,
  ]);
}

async function loadCorrida(
  pool: mysql.Pool,
  id: number,
): Promise<Record<string, unknown> | null> {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, passageiro_id, origem, destino, status, created_at, updated_at FROM corridas WHERE id = ?',
    [id],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    passageiro_id: row.passageiro_id,
    origem: row.origem,
    destino: row.destino,
    status: row.status,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  };
}

export async function handleMessage(
  msg: ConsumeMessage,
  deps: {
    redis: Redis;
    pool: mysql.Pool;
    mongo: Db;
  },
): Promise<void> {
  const envelope = parseEnvelope(msg);
  if (!envelope?.event_id) {
    throw new Error('mensagem inválida');
  }
  if (await isProcessed(deps.pool, envelope.event_id)) {
    console.log('[worker] dedup', envelope.event_id);
    return;
  }
  let snapshot: Record<string, unknown> | null = null;
  if (envelope.event === RABBIT.routing.corridaCriada) {
    const p = envelope.payload as unknown as CorridaCriadaPayload;
    snapshot =
      (await loadCorrida(deps.pool, p.corrida_id)) ?? {
        id: p.corrida_id,
        passageiro_id: p.passageiro_id,
        origem: p.origem,
        destino: p.destino,
        status: p.status,
      };
  } else if (envelope.event === RABBIT.routing.statusAlterado) {
    const p = envelope.payload as unknown as CorridaStatusAlteradoPayload;
    snapshot = await loadCorrida(deps.pool, p.corrida_id);
    if (snapshot) snapshot.status = p.status;
  } else {
    throw new Error(`evento desconhecido: ${envelope.event}`);
  }
  if (snapshot?.id) {
    const key = corridaRedisKey(Number(snapshot.id));
    await deps.redis.set(key, JSON.stringify(snapshot), 'EX', 3600);
  }
  await deps.mongo.collection('eventos').insertOne({
    ...envelope,
    ingested_at: new Date(),
  });
  await markProcessed(deps.pool, envelope.event_id);
}

export function retryCount(msg: ConsumeMessage): number {
  const headers = msg.properties.headers ?? {};
  const raw = headers['x-retry-count'];
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
}

export function nextRetryCount(msg: ConsumeMessage): number {
  return retryCount(msg) + 1;
}

export { MAX_RETRIES };
