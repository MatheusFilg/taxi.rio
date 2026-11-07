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
