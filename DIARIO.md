# Diário de bordo

## 2026-11-10

- **Entrega vídeo:** link no README — https://youtu.be/pzVKuJvBxZU; `LIMITES` atualizado (não pendente).
- **Rabbit compose 403:** com `load_definitions`, o broker **não cria** o user do `RABBITMQ_DEFAULT_*`; `definitions.json` só tinha vhost/filas → login `taxi` inválido. Corrigido com `users` + `permissions` no JSON.
- **DECISIONS.md:** removida D4 (metadado de docs locais); decisões técnicas **D1–D3, D5–D15** em ordem crescente; D8 sem referência a notas externas.
- **LIMITES / DIARIO / .gitignore:** sem menção ao arquivo de notas pessoais no texto avaliável.

## 2026-11-09

- **Commits Parte 3:** `68c35a8` k8s kind+Kustomize, `ec0c0cb` vhost Rabbit compose, `ce64c91` docs D15/LIMITES — push `main`.
- **Parte 3 mínima:** `k8s/base` Kustomize (deps + api/worker/ui; observabilidade no compose), kind + `kind-deploy.sh`, Secret via script, **D15** em `DECISIONS.md`, `LIMITES` atualizado.
- **kind falhou :8080:** Airflow local em 8080; cluster padrão passou a mapear **18080/13000/19090**; `cluster-compose-ports.yaml` opcional.
- **Validação kind (compose down):** `curl :13000/health` OK; UI `:18080` 200; `POST /corridas` 201; worker consumiu. Fix Rabbit: `rabbitmq-k8s.conf` sem import `definitions.json` (403 PLAIN no compose-style import).
- **LIMITES/D15:** alinhados ao overlay enxuto (sem Tempo/Prometheus no kind).
- **README:** guia do avaliador em ordem (openssl → compose → token com Bun ou `oven/bun` → curl/k6).

## 2026-11-08

- **k6 demo Parte 2:** `run-live-demo.sh` 10 VUs / 2m — 0% falhas, 100% checks; portais Prometheus+Rabbit atualizados; RELATORIO com números da sessão.
- **Docs:** removidas referências a notas locais de entrevista do repositório avaliável; `DECISIONS.md` só decisões técnicas.
- **Observabilidade manual (você):** Grafana TraceQL `service.name=api` vazio; logs com `trace_id` duplicado (`null` + hex). Causa: falta `resource.service.name` no OTel + export gRPC no bundle Docker não ingere no Tempo. Fix: resource `service.name`, exporter OTLP **HTTP** `:4318/v1/traces`, log só um `trace_id`.
- **CI GitHub:** push OK; 1ª falha Bun 1.2 vs lockfile 1.4; 2ª falha testes sem `test-private.pem` → fix Bun 1.4.2 + openssl no workflow.
- **Sparring Parte2 fechado:** D13 (Tempo+Grafana, logs JSON sem Loki, OTel na cadeia) e D14 (métrica fila opção B; alertas 5xx + fila `taxi.worker`) → registrado em `DECISIONS.md`; execução nos cards Backlog/Building.
- **Review correlation shipped:** Parte2-Correlation-Logs; Sentinel PASS; commits `8cbe8a7` + `a1ea944`; testes correlation/log 6/6; Maestri `Review-Parte2-Correlation-Logs-Sentinel`; próximo Epic — Rabbit-Metrics-B, HTTP metrics, OTel.
- **Rabbit metrics B shipped:** Parte2-Rabbit-Metrics-B; Sentinel PASS (`d62d98d`); PromQL `taxi.worker`; target rabbitmq UP com worker down; Maestri `Review-Parte2-Rabbit-Metrics-B-Sentinel`.
- **Metrics HTTP shipped:** Parte2-Metrics-HTTP; Sentinel PASS (`05967d5`+`fe0015b`+`38f9dd4`); prom-client; `metrics.test.ts` pass; Maestri `Review-Parte2-Metrics-HTTP-Sentinel`.
- **OTel Tempo Grafana shipped:** Parte2-OTel-Tempo-Grafana; Sentinel PASS (`1b1ef11`+`9618bcc`+`2658ef9`); Grafana/Tempo smoke 200; tracing tests; Maestri `Review-Parte2-OTel-Tempo-Grafana-Sentinel`.
- **Alerts shipped:** Parte2-Alerts; Sentinel PASS (`f7537f4`); TaxiApiHigh5xxRate + TaxiWorkerQueueBacklog; Maestri `Review-Parte2-Alerts-Sentinel`.
- **k6 shipped:** Parte2-k6-Load; Sentinel PASS (`3bb2409`+`0035b51`); smoke 0% fail + RELATORIO; Maestri `Review-Parte2-k6-Load-Sentinel`; **Epic Parte 2 completo**.

## 2026-11-07

- **Parte1-negócio Shipped:** Sentinel SHIP_READY (`68c18c0`); JWT/corridas/worker/UI/CI; fix lint+test worker.
- **Parte1-negócio:** JWT + corridas (API), worker Redis/Mongo/dedup, UI fluxos, CI Actions.
- Sparring cache **p4:** **B + invalidação** → **D12**.
- **Review blockers:** Forge/Nexus/Relay — `/metrics` mínimo, mount Rabbit definitions, README openssl para chave JWT local.
- **Parte1-Compose-Fundacao:** monorepo Bun+Turbo; `docker-compose.yml` (MySQL, Redis, Mongo, RabbitMQ, Prometheus, api, worker, ui); `packages/shared`; healthchecks; worker declara topologia Rabbit (D9/D10); schema MySQL inicial em `infra/mysql/init.sql`; README com comandos; `keys/test-public.pem` commitada; `mint-jwt` com jose.


[You have received this identical output 3 times. Re-reading '/home/matheusf/dev/pessoal/pref-rj-teste/DIARIO.md:raw' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]