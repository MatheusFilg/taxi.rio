# Diário de bordo

## 2026-11-08

- **CI GitHub:** push OK; 1ª falha Bun 1.2 vs lockfile 1.4; 2ª falha testes sem `test-private.pem` → fix Bun 1.4.2 + openssl no workflow.
- **Sparring Parte2 fechado:** D13 (Tempo+Grafana, logs JSON sem Loki, OTel na cadeia) e D14 (métrica fila opção B; alertas 5xx + fila `taxi.worker`) → registrado em `DECISIONS.md`; execução nos cards Backlog/Building.
- **Review correlation shipped:** Parte2-Correlation-Logs; Sentinel PASS; commits `8cbe8a7` + `a1ea944`; testes correlation/log 6/6; Maestri `Review-Parte2-Correlation-Logs-Sentinel`; próximo Epic — Rabbit-Metrics-B, HTTP metrics, OTel.
- **Rabbit metrics B shipped:** Parte2-Rabbit-Metrics-B; Sentinel PASS (`d62d98d`); PromQL `taxi.worker`; target rabbitmq UP com worker down; Maestri `Review-Parte2-Rabbit-Metrics-B-Sentinel`.
- **Metrics HTTP shipped:** Parte2-Metrics-HTTP; Sentinel PASS (`05967d5`+`fe0015b`+`38f9dd4`); prom-client; `metrics.test.ts` pass; Maestri `Review-Parte2-Metrics-HTTP-Sentinel`.

## 2026-11-07

- **Parte1-negócio Shipped:** Sentinel SHIP_READY (`68c18c0`); JWT/corridas/worker/UI/CI; fix lint+test worker.
- **Parte1-negócio:** JWT + corridas (API), worker Redis/Mongo/dedup, UI fluxos, CI Actions.
- Sparring cache **p4:** **B + invalidação** → **D12**.
- **Review blockers:** Forge/Nexus/Relay — `/metrics` mínimo, mount Rabbit definitions, README openssl para chave JWT local.
- **Parte1-Compose-Fundacao:** monorepo Bun+Turbo; `docker-compose.yml` (MySQL, Redis, Mongo, RabbitMQ, Prometheus, api, worker, ui); `packages/shared`; healthchecks; worker declara topologia Rabbit (D9/D10); schema MySQL inicial em `infra/mysql/init.sql`; README com comandos; `keys/test-public.pem` commitada; `mint-jwt` com jose.
