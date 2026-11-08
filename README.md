# Taxi.Rio — desafio técnico (Prefeitura / Rio)

Monorepo **Bun + Turborepo**: API Fastify, worker (RabbitMQ), UI React (Vite). Ver `DECISIONS.md` e `ESTUDO-DECISOES.md`.

## Pré-requisitos

- [Docker](https://docs.docker.com/) + Docker Compose v2
- [Bun](https://bun.sh/) (desenvolvimento local opcional)

## Subir tudo (Parte 1)

```bash
docker compose up --build
```

| Serviço    | URL |
|-----------|-----|
| UI        | http://localhost:8080 |
| API       | http://localhost:3000/health |
| Worker    | http://localhost:3001/health |
| RabbitMQ  | http://localhost:15672 (taxi / taxi) |
| Prometheus| http://localhost:9090 |
| Grafana   | http://localhost:3030 (admin / taxi) |
| Tempo     | OTLP gRPC `:4317`, HTTP `:4318`; UI/query `:3200` |

### Fluxo rápido (curl)

Gerar token (`keys/test-private.pem` — ver seção JWT):

```bash
TOK=$(bun run mint-jwt passageiro)
KEY=$(uuidgen)
curl -s -X POST http://localhost:3000/corridas \
  -H "Authorization: Bearer $TOK" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"origem":"A","destino":"B"}'
```

Motorista altera status:

```bash
MT=$(bun run mint-jwt motorista)
curl -s -X PATCH "http://localhost:3000/corridas/1/status" \
  -H "Authorization: Bearer $MT" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACEITA"}'
```

## Desenvolvimento local (sem Docker nas apps)

```bash
bun install
docker compose up mysql redis mongo rabbitmq prometheus tempo grafana
bun run --cwd apps/api dev
bun run --cwd apps/worker dev
bun run --cwd apps/ui dev
```

## JWT de teste

Chaves **fictícias** só para desenvolvimento. O repositório inclui `keys/test-public.pem` (verificação). A **privada não vai pro git** — gere uma vez por clone:

```bash
mkdir -p keys
openssl genrsa -out keys/test-private.pem 2048
openssl rsa -in keys/test-private.pem -pubout -out keys/test-public.pem
chmod 600 keys/test-private.pem
```

Gerar token (precisa de `bun install` na raiz):

```bash
bun run mint-jwt passageiro
bun run mint-jwt motorista
```

## Testes

```bash
bun run --cwd apps/api test
# integração (MySQL + Rabbit + Redis rodando):
INTEGRATION=1 bun run --cwd apps/api test
```

## CI (GitHub Actions) — Parte 1

A cada **push** ou **pull request** em `main`, o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) executa:

1. **verify** — Bun **1.4.2** (igual ao `packageManager` / `bun.lock`), `bun install`, lint, test, build
2. **docker** — `docker compose build api worker ui` (build das imagens)

Espelho local:

```bash
bun install && bun run lint && bun run test && bun run build
docker compose build api worker ui
```

Painel: `https://github.com/MatheusFilg/taxi.rio/actions` (após o workflow estar no remoto).

## Métricas (fundação)

API e worker expõem `GET /metrics` (Prometheus via `prom-client`) para os jobs no `prometheus.yml`: API com `http_requests_total` / `http_request_duration_seconds` (label `status_code` para alerta 5xx D14); worker com `taxi_worker_messages_*` (fila continua no job `rabbitmq`, D14-B).

RabbitMQ expõe métricas no plugin **rabbitmq_prometheus** (`:15692`); o job `rabbitmq` no Prometheus coleta `rabbitmq_queue_messages_ready` da fila `taxi.worker` (D14 opção B — selector em `packages/shared` `RABBIT_QUEUE_PROMETHEUS`).

Após subir o compose, targets em http://localhost:9090/targets devem marcar `api`, `worker` e `rabbitmq` como **UP** (pode levar ~15s). Query de smoke: `rabbitmq_queue_messages_ready{queue="taxi.worker"}`.

## Traces (D13 — infra)

**Tempo** + **Grafana** no compose; datasources **Prometheus** e **Tempo** provisionados (sem Loki). Logs continuam JSON no stdout (`docker compose logs api worker | jq`).

Com compose, api e worker já exportam via `OTEL_EXPORTER_OTLP_ENDPOINT=tempo:4317` (gRPC); HTTP em `:4318`. Trace alvo: `POST /corridas` → publish Rabbit (header `traceparent`) → consumer worker — busca no Grafana (datasource Tempo).

## Declaração de uso de IA

Usei assistentes de código (Cursor) para estruturar o monorepo, documentar decisões (`DECISIONS.md`, `ESTUDO-DECISOES.md`) e rascunhar implementação. Revisei e validei as escolhas de arquitetura (JWT RS256, Rabbit direct, idempotência, cache). Exemplo rejeitado/corrigido: mapeamento inicial de modelos Codex no Maestri — ajustado para **Composer + Grok** após testar limites do plano pessoal (`DIARIO.md`).

## Estrutura

```
apps/api      # Fastify
apps/worker   # Consumer RabbitMQ
apps/ui       # Vite + React
packages/shared
infra/        # MySQL init, etc.
observability/prometheus
observability/tempo
observability/grafana/provisioning
.github/workflows/ci.yml
```

Alertas D14 em `observability/alerts.yml` (compose) e `observability/alerts-prometheusrule.yaml` (K8s); UI em http://localhost:9090/alerts. Ver `observability/README.md`.

Artifatos restantes (Partes 2–3): `loadtest/`, `k8s/`.
