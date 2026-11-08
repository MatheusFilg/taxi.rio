import { trace } from '@opentelemetry/api';

export type WorkerLogLevel = 'info' | 'error';

export type WorkerLogFields = {
  correlation_id?: string | null;
  trace_id?: string | null;
  event_id?: string;
  event?: string;
  routing_key?: string;
  err?: string;
};

export function correlationIdFromBody(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { correlation_id?: unknown };
    if (typeof parsed.correlation_id === 'string' && parsed.correlation_id.length > 0) {
      return parsed.correlation_id;
    }
    return null;
  } catch {
    return null;
  }
}

export function activeTraceId(): string | null {
  const id = trace.getActiveSpan()?.spanContext().traceId;
  if (!id || /^0+$/.test(id)) return null;
  return id;
}

export function workerLogLine(
  level: WorkerLogLevel,
  msg: string,
  fields: WorkerLogFields = {},
): string {
  const record: Record<string, string | null> = {
    level,
    service: 'worker',
    msg,
    correlation_id: fields.correlation_id ?? null,
    trace_id: fields.trace_id !== undefined ? fields.trace_id : activeTraceId(),
  };
  if (fields.event_id) record.event_id = fields.event_id;
  if (fields.event) record.event = fields.event;
  if (fields.routing_key) record.routing_key = fields.routing_key;
  if (fields.err) record.err = fields.err;
  return JSON.stringify(record);
}

export function logWorker(
  level: WorkerLogLevel,
  msg: string,
  fields: WorkerLogFields = {},
): void {
  const line = workerLogLine(level, msg, fields);
  if (level === 'error') console.error(line);
  else console.log(line);
}
