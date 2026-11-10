# Taxi.Rio — desafio técnico (Prefeitura / Rio)

Monorepo **Bun + Turborepo**: API Fastify, worker (RabbitMQ), UI React (Vite). Ver `DECISIONS.md`, `DIARIO.md`, `LIMITES.md`.

## Pré-requisitos

| Uso | Ferramentas |
|-----|-------------|
| **Stack principal (Parte 1 + 2)** | [Docker](https://docs.docker.com/) + Docker Compose v2 |
| **Tokens JWT de teste** | `openssl` (gerar chave) + **Bun** *ou* imagem `oven/bun` (ver abaixo) |
| **Parte 3 (K8s)** | `kind`, `kubectl` — [`k8s/README.md`](k8s/README.md) |
| **k6 local (opcional)** | [k6](https://k6.io/) instalado; senão o script usa container |

## Guia do avaliador (ordem)

Reprodução pensada para **clone fresco** + Docker. Siga os passos nesta ordem.

### 1. Chaves JWT de teste (uma vez por clone)

A **pública** está no repo; a **privada não** (`.gitignore`). Gere com OpenSSL:

```bash
mkdir -p keys
openssl genrsa -out keys/test-private.pem 2048
openssl rsa -in keys/test-private.pem -pubout -out keys/test-public.pem
chmod 600 keys/test-private.pem
```

### 2. Subir o stack

```bash
docker compose up --build -d
```

Aguarde healthchecks (~1–2 min). Conferir:

```bash
curl -sf http://localhost:3000/health
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8080/
```

| Serviço    | URL |
|-----------|-----|
| UI        | http://localhost:8080 |
| API       | http://localhost:3000/health |
| Worker    | http://localhost:3001/health |
| RabbitMQ  | http://localhost:15672 (taxi / taxi) |
| Prometheus| http://localhost:9090 |
| Grafana   | http://localhost:3030 (admin / taxi) |
| Tempo     | OTLP gRPC `:4317`, HTTP `:4318`; query `:3200` |

### 3. Obter token JWT

**Com Bun na máquina** (após `bun install` na raiz):

```bash
bun install
export TOK=$(bun run mint-jwt passageiro)
```

**Só com Docker** (sem instalar Bun no host):

```bash
export TOK=$(docker run --rm -v "$PWD:/app" -w /app oven/bun:1.4-alpine \
  sh -c "bun install --silent && bun run scripts/mint-jwt.ts passageiro")
```

Na **UI**, cole o token na tela de login.

### 4. Fluxo feliz (API)

```bash
KEY=$(uuidgen 2>/dev/null || openssl rand -hex 16)
curl -s -X POST http://localhost:3000/corridas \
  -H "Authorization: Bearer $TOK" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"origem":"A","destino":"B"}'
```

Motorista altera status:

```bash
export MT=$(bun run mint-jwt motorista 2>/dev/null || docker run --rm -v "$PWD:/app" -w /app oven/bun:1.4-alpine \
  sh -c "bun install --silent && bun run scripts/mint-jwt.ts motorista")
curl -s -X PATCH "http://localhost:3000/corridas/1/status" \
  -H "Authorization: Bearer $MT" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACEITA"}'
```

### 5. Parte 2 (mesmo compose)

- Métricas: http://localhost:9090/targets (`api`, `worker`, `rabbitmq` **UP**)
- Alertas: http://localhost:9090/alerts (`observability/alerts.yml`)
- Traces: Grafana http://localhost:3030 → Explore → Tempo → `{ resource.service.name = "api" }`
- k6: `export JWT_TOKEN="$TOK" && bash loadtest/run-smoke.sh` — detalhes em `loadtest/RELATORIO.md`

### 6. Parte 3 (cluster local, opcional no mesmo dia)

```bash
bash k8s/scripts/kind-deploy.sh
# UI http://localhost:18080  API http://localhost:13000/health
```

Ver `k8s/README.md` (portas diferentes do compose para evitar conflito com :8080).

---

## Desenvolvimento local (sem Docker nas apps)

```bash
bun install
docker compose up mysql redis mongo rabbitmq prometheus tempo grafana
bun run --cwd apps/api dev
bun run --cwd apps/worker dev
bun run --cwd apps/ui dev
```

## Testes

```bash
bun install
bun run --cwd apps/api test
# integração (MySQL + Rabbit + Redis rodando):
INTEGRATION=1 bun run --cwd apps/api test
```

## CI (GitHub Actions)

A cada **push** ou **pull request** em `main`, o workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) executa lint, test, build e `docker compose build api worker ui`.

Espelho local:

```bash
bun install && bun run lint && bun run test && bun run build
docker compose build api worker ui
```

Painel: https://github.com/MatheusFilg/taxi.rio/actions

## Observabilidade (resumo)

- **Métricas:** `GET /metrics` na API e no worker; fila Rabbit em `:15692` (D14-B).
- **Traces (D13):** OTLP **HTTP** para Tempo (`http://tempo:4318/v1/traces`); logs JSON no stdout.
- **Alertas D14:** `TaxiApiHigh5xxRate`, `TaxiWorkerQueueBacklog` — ver `observability/README.md`.

## Declaração de uso de IA

Usei assistentes de código (Cursor) para estruturar o monorepo, documentar decisões (`DECISIONS.md`, `DIARIO.md`) e rascunhar implementação. Revisei e validei as escolhas de arquitetura (JWT RS256, Rabbit direct, idempotência, cache). Exemplo corrigido: export OTel gRPC → HTTP após validação manual no Grafana (`DIARIO.md` 2026-11-08).

**Vídeo de demonstração (≤10 min):** https://youtu.be/pzVKuJvBxZU

## Estrutura

```
apps/api      # Fastify
apps/worker   # Consumer RabbitMQ
apps/ui       # Vite + React
packages/shared
infra/        # MySQL init, etc.
observability/
loadtest/     # k6 + RELATORIO.md
k8s/          # Parte 3 — kind + Kustomize
.github/workflows/ci.yml
```
