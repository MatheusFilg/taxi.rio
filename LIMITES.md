# Limites conhecidos

Atualizado conforme o desafio avança. **Última revisão:** 2026-11-09.

---

## Status geral (para o avaliador)

| Parte | Situação | Onde ver |
|-------|----------|----------|
| **Parte 1** | Entregue (obrigatória) | `docker compose up`, JWT, fila, testes, CI |
| **Parte 2** | Entregue | Métricas, alertas, OTel/Tempo, k6 + `loadtest/RELATORIO.md` |
| **Parte 3** | **Mínima (kind)** | `k8s/README.md` + `bash k8s/scripts/kind-deploy.sh` |

**CI:** https://github.com/MatheusFilg/taxi.rio/actions — verde após fix `acdd850` (2026-11-08).

---

## Parte 1 — feito

- Compose completo; JWT RS256; `POST` / `PATCH` / `GET` `/corridas`; idempotência HTTP; cache Redis (worker SET + invalidação na API no PATCH).
- Worker: dedup `processed_events`, Mongo auditoria, Redis projeção, retry/DLQ (D10) — republicação manual, sem plugin delayed do Rabbit.
- UI mínima (token, criar corrida, GET, motorista PATCH); proxy nginx (`docker compose restart ui` após rebuild da API se 502).
- GitHub Actions: lint, test, build apps + imagens Docker.
- Testes: health + auth 401/403 + integração opcional `INTEGRATION=1`.

---

## Parte 2 — feito

- **Correlação:** `x-correlation-id`, logs JSON (`correlation_id` / `trace_id`) na API e no worker.
- **Métricas HTTP:** prom-client em API e worker; scrape Prometheus.
- **Fila (D14 opção B):** métricas Rabbit em `:15692`; alerta de backlog `taxi.worker`.
- **Alertas (D14):** `TaxiApiHigh5xxRate` + `TaxiWorkerQueueBacklog` em `observability/prometheus/alerts.yml` e `alerts-prometheusrule.yaml`.
- **OTel (D13):** Tempo + Grafana no compose; export OTLP **HTTP** `http://tempo:4318/v1/traces`; `resource.service.name` = `api` / `worker` (ajuste pós-validação manual — gRPC + bundle Bun não ingeria traces).
- **k6:** `loadtest/smoke-corridas.js`, `run-smoke.sh`, `run-live-demo.sh`, `RELATORIO.md` (smoke + demo 10 VUs / 2 min).

Decisões: **D13**, **D14** em `DECISIONS.md`.

---

## Parte 3 — feito (mínimo)

- **`k8s/base/`** — Deployments/Services: MySQL, Redis, Mongo, RabbitMQ, api, worker, ui (overlay enxuto — **sem** Tempo/Prometheus no kind por espaço em disco).
- **kind** portas host **18080 / 13000** (evita :8080 ocupado); `cluster-compose-ports.yaml` opcional.
- **Probes** liveness/readiness e **requests/limits** nos YAML (dev local).
- **ConfigMap** `taxi-app` + ConfigMaps de infra (init SQL, JWT público, Rabbit `rabbitmq-k8s.conf` sem import `definitions.json` — topologia no worker).
- **Secret** `taxi-credentials` — criado por script; nenhum valor real no git (`k8s/examples/secret.env.example`).

## Parte 3 — não feito

- **Grafana** no cluster kind (continua no compose).
- **Prometheus Operator** + aplicar `alerts-prometheusrule.yaml` via CRD.
- **KEDA** (bônus PDF) — ver “com mais tempo”.

---

## Outros não feitos / cortes conscientes

| Item | Motivo |
|------|--------|
| OpenAPI / Swagger na API | Fora do mínimo Parte 1; portal Swagger pendente |
| Loki / busca centralizada de logs | D13: stdout JSON + `docker compose logs` |
| JWKS | PEM versionada atende o enunciato |
| E2E Maestri automatizado | Orquestração local (`.maestri/` ignorada no git) |
| `ESTUDO-DECISOES.md` | Notas de estudo **locais** (`.gitignore`) — avaliador vê `DECISIONS.md` + `DIARIO.md` |

---

## Com mais tempo faríamos

- **Parte 3:** Tempo/Prometheus/Grafana **dentro** do kind; multi-réplica worker.
- **KEDA** no worker + cenário k6 mostrando backlog e scale (bônus PDF).
- Retry com **delayed message** / plugin Rabbit em vez de republicação manual.
- OpenAPI na API; dashboards Grafana provisionados (hoje só datasources).
- Testes E2E UI no fluxo passageiro/motorista.
