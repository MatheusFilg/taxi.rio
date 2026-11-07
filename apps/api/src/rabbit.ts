import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';
import {
  RABBIT,
  type CorridaEventEnvelope,
  type CorridaEventType,
} from '@taxi/shared';

let channel: amqp.Channel | null = null;

async function getChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL ?? 'amqp://taxi:taxi@localhost:5672';
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(RABBIT.exchange, 'direct', { durable: true });
  return channel;
}

export async function publishCorridaEvent<TPayload>(
  event: CorridaEventType,
  payload: TPayload,
  correlationId: string,
): Promise<string> {
  const ch = await getChannel();
  const event_id = randomUUID();
  const envelope: CorridaEventEnvelope<TPayload> = {
    event,
    event_id,
    correlation_id: correlationId,
    occurred_at: new Date().toISOString(),
    payload,
  };
  const routingKey =
    event === RABBIT.routing.corridaCriada
      ? RABBIT.routing.corridaCriada
      : RABBIT.routing.statusAlterado;
  ch.publish(
    RABBIT.exchange,
    routingKey,
    Buffer.from(JSON.stringify(envelope)),
    { persistent: true, contentType: 'application/json' },
  );
  return event_id;
}
