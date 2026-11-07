# Taxi.Rio — desafio técnico (Prefeitura / Rio)

Monorepo **Bun + Turborepo**: API Fastify, worker (RabbitMQ), UI React (Vite). Ver `DECISIONS.md` e `ESTUDO-DECISOES.md`.

## Pré-requisitos

- [Docker](https://docs.docker.com/) + Docker Compose v2
- [Bun](https://bun.sh/) (desenvolvimento local opcional)

## Subir tudo (Parte 1 — fundação)

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

## Desenvolvimento local (sem Docker nas apps)

```bash
bun install
docker compose up mysql redis mongo rabbitmq prometheus
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

## Métricas (fundação)

API e worker expõem `GET /metrics` (texto Prometheus mínimo) para o job no `prometheus.yml`. Métricas de negócio/latência ficam na Parte 2.

Após subir o compose, targets em http://localhost:9090/targets devem marcar `api` e `worker` como **UP** (pode levar ~15s).

## Testes

```bash
bun run --cwd apps/api test
```

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
```

Artifatos do desafio (Partes 2–3): `observability/alerts*.yml`, `loadtest/`, `k8s/` — em construção.
