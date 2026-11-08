import { Gauge, Registry } from 'prom-client';

/** Métricas mínimas Prometheus (Parte 1 — scrape OK; Parte 2 expande). */
export function renderPrometheusMetrics(service: 'api' | 'worker'): string {
  const lines = [
    '# HELP taxi_up Processo no ar (1 = up).',
    '# TYPE taxi_up gauge',
    'taxi_up 1',
    '# HELP taxi_info Informação estática do serviço.',
    '# TYPE taxi_info gauge',
    `taxi_info{service="${service}"} 1`,
  ];
  return `${lines.join('\n')}\n`;
}

/** Nomes de séries HTTP na API (Parte 2; D14 alerta 5xx). */
export const API_HTTP_PROMETHEUS = {
  requestsTotalMetric: 'http_requests_total',
  requestDurationMetric: 'http_request_duration_seconds',
  /** Taxa de respostas 5xx sobre todo o tráfego HTTP da API (card Alerts). */
  api5xxRateSelector: `sum(rate(http_requests_total{job="api",status_code=~"5.."}[5m])) / clamp_min(sum(rate(http_requests_total{job="api"}[5m])), 1e-9)`,
} as const;

/** Séries de processamento Rabbit no worker (não substitui fila D14-B). */
export const WORKER_PROCESS_PROMETHEUS = {
  messagesProcessedMetric: 'taxi_worker_messages_processed_total',
  messagesFailedMetric: 'taxi_worker_messages_failed_total',
  processingDurationMetric: 'taxi_worker_message_processing_duration_seconds',
} as const;

export function attachTaxiServiceGauges(
  registry: Registry,
  service: 'api' | 'worker',
): void {
  const up = new Gauge({
    name: 'taxi_up',
    help: 'Processo no ar (1 = up).',
    registers: [registry],
  });
  const info = new Gauge({
    name: 'taxi_info',
    help: 'Informação estática do serviço.',
    labelNames: ['service'],
    registers: [registry],
  });
  up.set(1);
  info.set({ service }, 1);
}

export async function registryToPrometheusText(
  registry: Registry,
): Promise<string> {
  return registry.metrics();
}
