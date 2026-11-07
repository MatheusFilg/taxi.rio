# Diário de bordo

## 2026-11-07

- **Parte1-negócio:** JWT + corridas (API), worker Redis/Mongo/dedup, UI fluxos, CI Actions; cards em Review.
- Sparring cache **p4:** **B + invalidação** → **D12**.
- **Review blockers:** Forge/Nexus/Relay — `/metrics` mínimo, mount Rabbit definitions, README openssl para chave JWT local.
- **Parte1-Compose-Fundacao:** monorepo Bun+Turbo; `docker-compose.yml` (MySQL, Redis, Mongo, RabbitMQ, Prometheus, api, worker, ui); `packages/shared`; healthchecks; worker declara topologia Rabbit (D9/D10); schema MySQL inicial em `infra/mysql/init.sql`; README com comandos; `keys/test-public.pem` commitada; `mint-jwt` com jose.
