#!/usr/bin/env bash
# Parte 3 — sobe cluster kind, carrega imagens locais, apply kustomize.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

CLUSTER_NAME="${KIND_CLUSTER_NAME:-taxi-rio}"
KIND_CONFIG="${KIND_CONFIG:-k8s/kind/cluster.yaml}"

# Portas publicadas no host conforme KIND_CONFIG (defaults = cluster.yaml)
UI_PORT="${K8S_UI_PORT:-18080}"
API_PORT="${K8S_API_PORT:-13000}"
PROM_PORT="${K8S_PROM_PORT:-19090}"
if [[ "$KIND_CONFIG" == *compose-ports* ]]; then
  UI_PORT=8080
  API_PORT=3000
  PROM_PORT=9090
fi

check_host_port() {
  local port=$1 name=$2
  if command -v ss >/dev/null 2>&1 && ss -tln | grep -q ":${port} "; then
    echo "ERRO: porta ${port} (${name}) já em uso no host."
    docker ps --format '  {{.Names}} → {{.Ports}}' 2>/dev/null | grep -F "${port}" || true
    echo "  Pare o serviço ou use o cluster padrão (portas 18080/13000/19090): bash k8s/scripts/kind-deploy.sh"
    if [[ "${port}" == "8080" ]]; then
      echo "  Dica: Airflow local costuma ocupar :8080 — não use cluster-compose-ports.yaml."
    fi
    exit 1
  fi
}

if ! command -v kind >/dev/null 2>&1; then
  echo "Instale kind: https://kind.sigs.k8s.io/"
  exit 1
fi

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  check_host_port "$UI_PORT" "UI"
  check_host_port "$API_PORT" "API"
  check_host_port "$PROM_PORT" "Prometheus"
  kind create cluster --name "$CLUSTER_NAME" --config "$KIND_CONFIG"
else
  echo "Cluster kind '$CLUSTER_NAME' já existe (delete: kind delete cluster --name $CLUSTER_NAME)"
fi

# kubeconfig após create
kind export kubeconfig --name "$CLUSTER_NAME" 2>/dev/null || true

echo "Build imagens (mesmo Dockerfile do compose)..."
docker compose build api worker ui

for img in taxi-rio-api taxi-rio-worker taxi-rio-ui; do
  kind load docker-image "${img}:latest" --name "$CLUSTER_NAME"
done

bash k8s/scripts/create-secrets.sh

kubectl kustomize k8s/base --load-restrictor=LoadRestrictionsNone | kubectl apply -f -

echo ""
echo "Aguardando rollouts (pode levar 2–3 min no MySQL)..."
kubectl -n taxi rollout status deployment/mysql --timeout=300s || true
kubectl -n taxi rollout status deployment/api --timeout=180s || true
kubectl -n taxi rollout status deployment/worker --timeout=180s || true

echo ""
echo "URLs (host — portas kind padrão):"
echo "  UI:         http://localhost:${UI_PORT}"
echo "  API health: http://localhost:${API_PORT}/health"
echo "  Prometheus: Parte 2 — use docker compose (não está no overlay kind mínimo)"
