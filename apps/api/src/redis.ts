import Redis from 'ioredis';
import { corridaRedisKey } from '@taxi/shared';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  }
  return client;
}

export async function getCorridaFromCache(
  id: number,
): Promise<Record<string, unknown> | null> {
  const redis = getRedis();
  if (redis.status !== 'ready') {
    await redis.connect().catch(() => undefined);
  }
  const raw = await redis.get(corridaRedisKey(id)).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function invalidateCorridaCache(id: number): Promise<void> {
  const redis = getRedis();
  if (redis.status !== 'ready') {
    await redis.connect().catch(() => undefined);
  }
  await redis.del(corridaRedisKey(id)).catch(() => undefined);
}
