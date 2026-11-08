#!/usr/bin/env bash
# Demo ao vivo Parte 2: carga k6 visível em fila/métricas (~2 min).
# Uso: bash loadtest/run-live-demo.sh
# Enquanto roda: portais Prometheus, RabbitMQ, Worker-Metrics, Grafana Tempo; logs no terminal.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export JWT_TOKEN="${JWT_TOKEN:-$(bun scripts/mint-jwt.ts passageiro)}"
export VUS="${VUS:-10}"
export DURATION="${DURATION:-2m}"
export SLEEP="${SLEEP:-0.15}"

echo "=== k6 demo Parte 2 ==="
echo "VUS=$VUS DURATION=$DURATION SLEEP=$SLEEP"
echo "Abra: Portal-Prometheus-Metrics, Portal-RabbitMQ, Portal-Worker-Metrics"
echo "Logs (outro terminal): docker compose logs -f api worker | grep -E 'k6|corrida|correlation'"
echo ""

exec bash loadtest/run-smoke.sh
