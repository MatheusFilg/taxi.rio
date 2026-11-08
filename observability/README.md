# Observabilidade (Parte 2)

| Artefato | Uso |
|----------|-----|
| `prometheus/prometheus.yml` | Scrape: `api`, `worker`, `rabbitmq` (D14-B `:15692`) |
| `alerts.yml` | Regras de alerta no Prometheus do compose (`rule_files`) |
| `alerts-prometheusrule.yaml` | Mesmas regras como CRD `PrometheusRule` (Parte 3 / K8s) |
| `tempo/tempo.yaml` | Traces OTLP (Parte 2 OTel) |
| `grafana/` | Datasources provisionadas |

## Alertas D14

1. **TaxiApiHigh5xxRate** — expressão alinhada a `API_HTTP_PROMETHEUS.api5xxRateSelector` (`packages/shared`).
2. **TaxiWorkerQueueBacklog** — `rabbitmq_queue_messages_ready` na fila `taxi.worker` (`RABBIT_QUEUE_PROMETHEUS`).

Smoke: http://localhost:9090/alerts (ambas regras listadas; estado *inactive* em operação normal).
