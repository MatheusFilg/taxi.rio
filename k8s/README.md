# Parte 3 — Kubernetes local (mínimo)

Stack **kind** + **Kustomize** em `k8s/base/`: deps (MySQL, Redis, Mongo, RabbitMQ), **api**, **worker**, **ui**.  
**Observabilidade (Tempo/Prometheus/Grafana)** e **KEDA** ficam no **compose** neste desafio — overlay K8s enxuto para caber em disco kind (ver `LIMITES.md`). `OTEL_EXPORTER_OTLP_ENDPOINT` vazio no ConfigMap do cluster.

**RabbitMQ no K8s:** `config/rabbitmq-k8s.conf` (sem `management.load_definitions`); filas/exchanges no **worker** (`assertQueue`/`assertExchange`). No compose continua `definitions.json` + `infra/rabbitmq/rabbitmq.conf`.

## Por quê kind + Kustomize (D15)

| Escolha | Motivo |
|---------|--------|
| **kind** | Um nó, portas mapeadas **18080 / 13000 / 19090** por padrão (evita :8080 ocupado), padrão em tutoriais K8s |
| **Kustomize** | YAML plano, sem Helm chart extra; `kubectl apply -k` |
| **Secret fora do git** | `kubectl create` via script; exemplo em `k8s/examples/secret.env.example` |

## Pré-requisitos

- Docker, `kind`, `kubectl`
- Repositório clonado; `keys/test-public.pem` presente

## Subir (recomendado)

```bash
bash k8s/scripts/kind-deploy.sh
```

### Portas no host (conflito com compose / Airflow)

O **kind padrão** (`k8s/kind/cluster.yaml`) expõe:

| Serviço | URL |
|---------|-----|
| UI | http://localhost:**18080** |
| API | http://localhost:**13000** |
| Prometheus | http://localhost:**19090** |

Assim não compete com `docker compose` (8080/3000/9090) nem com outros projetos (ex.: **Airflow em :8080**).

Para as **mesmas portas do compose**, libere 8080/3000/9090 e use:

```bash
KIND_CONFIG=k8s/kind/cluster-compose-ports.yaml bash k8s/scripts/kind-deploy.sh
```

Se o create do kind falhar com `Bind for 0.0.0.0:8080 failed: port is already allocated`, outro container já usa a porta — use o cluster padrão ou pare o serviço (`docker ps`).

Teste:

```bash
curl -sf http://localhost:13000/health
JWT + corrida (na raiz do repo):

```bash
TOK=$(bun scripts/mint-jwt.ts passageiro)
curl -s -X POST http://localhost:13000/corridas \
  -H "Authorization: Bearer $TOK" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"origem":"K8s","destino":"kind"}'
```

## Probes e resources

Cada Deployment define **liveness** + **readiness** (HTTP em api/worker/ui, exec/db nos dados).  
**requests/limits** comentados no YAML da API/worker — valores de dev local, não sizing de produção.

## Alertas D14 no cluster

- **Compose:** `observability/alerts.yml` no Prometheus do compose.
- **K8s (Operator):** `observability/alerts-prometheusrule.yaml` (CRD `PrometheusRule`) — aplicar só se tiver **Prometheus Operator**; este manifesto base usa Prometheus “vanilla” com o mesmo `alerts.yml` no ConfigMap.

## Derrubar cluster

```bash
kind delete cluster --name taxi-rio
```
