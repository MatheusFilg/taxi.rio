import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import {
  WORKER_PROCESS_PROMETHEUS,
  attachTaxiServiceGauges,
  registryToPrometheusText,
} from '@taxi/shared';

const registry = new Registry();
collectDefaultMetrics({ register: registry });
attachTaxiServiceGauges(registry, 'worker');

export const messagesProcessedTotal = new Counter({
  name: WORKER_PROCESS_PROMETHEUS.messagesProcessedMetric,
  help: 'Mensagens Rabbit processadas com sucesso (ack).',
  labelNames: ['event'] as const,
  registers: [registry],
});

export const messagesFailedTotal = new Counter({
  name: WORKER_PROCESS_PROMETHEUS.messagesFailedMetric,
  help: 'Mensagens que esgotaram retries e foram para DLQ.',
  labelNames: ['event'] as const,
  registers: [registry],
});

export const messageProcessingDurationSeconds = new Histogram({
  name: WORKER_PROCESS_PROMETHEUS.processingDurationMetric,
  help: 'Tempo de processamento de uma mensagem (segundos).',
  labelNames: ['event'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
});

export async function getWorkerMetricsText(): Promise<string> {
  return registryToPrometheusText(registry);
}
