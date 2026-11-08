import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';
import {
  RABBIT,
  type CorridaEventEnvelope,
  type CorridaEventType,
} from '@taxi/shared';
import { withPublishSpan } from './tracing.js';

let channel: amqp.Channel | null = null;

async function getChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL ?? 'amqp://taxi:taxi@localhost:5672';
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange(RABBIT.exchange, 'direct', { durable: true });
  return channel;
}

export function buildCorridaEnvelope<TPayload>(
  event: CorridaEventType,
  payload: TPayload,
  correlationId: string,
  eventId: string = randomUUID(),
  occurredAt: string = new Date().toISOString(),
): CorridaEventEnvelope<TPayload> {
  return {
    event,
    event_id: eventId,
    correlation_id: correlationId,
    occurred_at: occurredAt,
    payload,
  };
}

export async function publishCorridaEvent<TPayload>(
  event: CorridaEventType,
  payload: TPayload,
  correlationId: string,
): Promise<string> {
  const routingKey =
    event === RABBIT.routing.corridaCriada
      ? RABBIT.routing.corridaCriada
      : RABBIT.routing.statusAlterado;
  return withPublishSpan(routingKey, async (traceHeaders) => {
    const ch = await getChannel();
    const envelope = buildCorridaEnvelope(event, payload, correlationId);
    ch.publish(
      RABBIT.exchange,
      routingKey,
      Buffer.from(JSON.stringify(envelope)),
      {
        persistent: true,
        contentType: 'application/json',
        headers: traceHeaders,
      },
    );
    return envelope.event_id;
  });
}
