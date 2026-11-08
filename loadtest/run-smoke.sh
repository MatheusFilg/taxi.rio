#!/usr/bin/env bash
# Smoke k6 com stack Docker (api na rede compose).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export JWT_TOKEN="${JWT_TOKEN:-$(bun scripts/mint-jwt.ts passageiro)}"
export BASE_URL="${BASE_URL:-http://api:3000}"
export VUS="${VUS:-2}"
export DURATION="${DURATION:-30s}"
export SLEEP="${SLEEP:-0.3}"

NETWORK="${COMPOSE_PROJECT_NAME:-taxi-rio}_default"
if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  NETWORK="$(docker compose ps -q api 2>/dev/null | head -1 | xargs -r docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')"
fi

if command -v k6 >/dev/null 2>&1; then
  export BASE_URL="${BASE_URL:-http://localhost:3000}"
  exec k6 run loadtest/smoke-corridas.js
fi

exec docker run --rm \
  --network "$NETWORK" \
  -v "$ROOT/loadtest:/loadtest:ro" \
  -e JWT_TOKEN \
  -e BASE_URL \
  -e VUS \
  -e DURATION \
  -e SLEEP \
  grafana/k6:0.54.0 run /loadtest/smoke-corridas.js


[You have received this identical output 3 times. Re-reading '/home/matheusf/dev/pessoal/pref-rj-teste/loadtest/run-smoke.sh:raw' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]