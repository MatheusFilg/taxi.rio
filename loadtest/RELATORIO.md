# Relatório — smoke k6 (Parte 2)

Cenário leve para validar **POST `/corridas`** (JWT passageiro + `Idempotency-Key`) e **GET `/corridas/:id`** com a stack Docker (`api`, `worker`, MySQL, Redis, Rabbit).

## Parâmetros

| Item | Valor |
|------|--------|
| Script | `loadtest/smoke-corridas.js` |
| Executor | `constant-vus` |
| VUs | **2** (default; `VUS`) |
| Duração | **30s** (default; `DURATION`) |
| Pausa entre iterações | 0,3s (`SLEEP`) |
| Thresholds | checks > 95%; falhas HTTP < 5%; p95 POST < 3s; p95 GET < 1,5s |

## Como rodar

Pré-requisito: `docker compose up -d` (pelo menos `mysql`, `redis`, `rabbitmq`, `tempo`, `api`, `worker`).

```bash
# Recomendado — mint JWT + k6 via imagem Grafana na rede compose
bash loadtest/run-smoke.sh

# Demo ao vivo Parte 2 (~2 min, 10 VUs) — olhar portais Rabbit/Prometheus enquanto roda
bash loadtest/run-live-demo.sh

# Ajustes opcionais
export VUS=2 DURATION=20s
bash loadtest/run-smoke.sh

# k6 instalado localmente (API em localhost)
export JWT_TOKEN="$(bun scripts/mint-jwt.ts passageiro)"
export BASE_URL=http://localhost:3000
k6 run loadtest/smoke-corridas.js
```

Variáveis: `JWT_TOKEN` (obrigatório), `BASE_URL`, `VUS`, `DURATION`, `SLEEP`.

## Resultado de exemplo (2026-11-08, dev local)

Execução: `VUS=2`, `DURATION=20s`, `BASE_URL=http://api:3000` (container k6 na rede `taxi-rio`).

| Métrica | Valor |
|---------|--------|
| Iterações | 124 (~6,1/s) |
| Requisições HTTP | 248 (POST + GET por iteração) |
| `http_req_failed` | **0,00%** |
| Checks | **100,00%** (496/496) |
| **p95** `endpoint:post_corrida` | **40,29 ms** |
| **p95** `endpoint:get_corrida` | **1,77 ms** |
| p95 global `http_req_duration` | 35,51 ms |

Todos os thresholds do script passaram.

## Resultado demo ao vivo (2026-11-08, `run-live-demo.sh`)

Parâmetros: `VUS=10`, `DURATION=2m`, `SLEEP=0,12` (k6 local em `localhost:3000`).

| Métrica | Valor |
|---------|--------|
| Iterações | 3497 (~29/s) |
| Requisições HTTP | 6994 (~58/s) |
| `http_req_failed` | **0,00%** |
| Checks | **100,00%** (13988/13988) |
| **p95** `endpoint:post_corrida` | **57,82 ms** |
| **p95** `endpoint:get_corrida` | **2,84 ms** |

Durante o teste: fila `taxi.worker` com consume ativo; séries `http_requests_total` e `rabbitmq_queue_messages_ready` visíveis no Prometheus; traces `service.name=api` no Grafana após o flush OTel.

## Conclusão

Com carga mínima (2 VUs), a API responde dentro dos limites do smoke, sem erros HTTP e com fluxo criar→consultar consistente. Este teste **não** substitui carga de estresse (Parte 3 / KEDA); serve como evidência Parte 2 de que o caminho autenticado de corridas aguenta tráfego sintético baixo na stack compose.