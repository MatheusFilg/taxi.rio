#!/usr/bin/env bash
# Cria Secret taxi-credentials no namespace taxi (não commitar valores reais).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

NAMESPACE="${K8S_NAMESPACE:-taxi}"
ENV_FILE="${1:-k8s/examples/secret.env.example}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${MYSQL_USER:?MYSQL_USER}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD}"
: "${RABBITMQ_USER:?RABBITMQ_USER}"
: "${RABBITMQ_PASSWORD:?RABBITMQ_PASSWORD}"

RABBITMQ_URL="amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic taxi-credentials \
  --from-literal=MYSQL_USER="$MYSQL_USER" \
  --from-literal=MYSQL_PASSWORD="$MYSQL_PASSWORD" \
  --from-literal=MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  --from-literal=RABBITMQ_USER="$RABBITMQ_USER" \
  --from-literal=RABBITMQ_PASSWORD="$RABBITMQ_PASSWORD" \
  --from-literal=RABBITMQ_URL="$RABBITMQ_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret taxi-credentials aplicado no namespace $NAMESPACE"
