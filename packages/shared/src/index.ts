export {
  API_HTTP_PROMETHEUS,
  WORKER_PROCESS_PROMETHEUS,
  attachTaxiServiceGauges,
  registryToPrometheusText,
  renderPrometheusMetrics,
} from './metrics';

export type Perfil = 'passageiro' | 'motorista';

export interface TaxiJwtClaims {
  sub: string;
  perfil: Perfil;
  iss?: string;
  aud?: string;
  iat?: number;
  exp: number;
}

export const RABBIT = {
  exchange: 'taxi.direct',
  dlx: 'taxi.dlx',
  workerQueue: 'taxi.worker',
  dlq: 'taxi.worker.dlq',
  routing: {
    corridaCriada: 'corrida.criada',
    statusAlterado: 'corrida.status_alterado',
  },
} as const;

/** D14 opção B — nome da série e selector para alertas (Gauge / Prometheus). */
export const RABBIT_QUEUE_PROMETHEUS = {
  messagesReadyMetric: 'rabbitmq_queue_messages_ready',
  workerMessagesReadySelector: `rabbitmq_queue_messages_ready{queue="${RABBIT.workerQueue}",vhost="/"}`,
} as const;

export type CorridaEventType =
  | typeof RABBIT.routing.corridaCriada
  | typeof RABBIT.routing.statusAlterado;

export type CorridaStatus =
  | 'SOLICITADA'
  | 'ACEITA'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'CANCELADA';

export interface CorridaEventEnvelope<TPayload = Record<string, unknown>> {
  event: CorridaEventType;
  event_id: string;
  correlation_id: string;
  occurred_at: string;
  payload: TPayload;
}

export interface CorridaCriadaPayload {
  corrida_id: number;
  passageiro_id: string;
  status: CorridaStatus;
  origem: string;
  destino: string;
}

export interface CorridaStatusAlteradoPayload {
  corrida_id: number;
  status: CorridaStatus;
}

export function corridaRedisKey(corridaId: number): string {
  return `corrida:${corridaId}`;
}

export function canCreateCorrida(perfil: Perfil): boolean {
  return perfil === 'passageiro';
}

export function canPatchStatus(perfil: Perfil): boolean {
  return perfil === 'motorista';
}
