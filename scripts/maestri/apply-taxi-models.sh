#!/usr/bin/env bash
# Aplica mapa Modelos-Agentes-Cursor (workspace Taxi, conta pessoal).
# Plano verificado: Composer + Grok (Codex/Gemini/Claude = third_party fora do weekly).
set -euo pipefail

REPO="/home/matheusf/dev/pessoal/pref-rj-teste"
export MAESTRI_WORKSPACE_ID="a6fe2825-f6c8-4c42-954c-3fd2df4a9c6b"
export MAESTRI_TERMINAL_ID="9e3b609c-88de-4ef0-8d12-b85c01a12fad"
cd "$REPO"

if [[ -f "$HOME/dev/pessoal/.envrc" ]]; then
  set +u
  # shellcheck disable=SC1091
  source "$HOME/dev/pessoal/.envrc" 2>/dev/null || true
  set -u
fi

PRESET="Cursor"
apply() {
  local name="$1"
  local cmd="$2"
  echo "== $name =="
  maestri recruit "$name" --preset "$PRESET" --replace "$name" --command "$cmd" --dir "$REPO"
}

# Taxi-Maestri: ajuste manual no canvas:
# agent --trust --workspace $REPO --model composer-2.5

apply "Compass" "agent --trust --workspace $REPO --mode plan --model composer-2.5"
apply "Nexus" "agent --trust --workspace $REPO --model grok-4.7-medium"
apply "Relay" "agent --trust --workspace $REPO --model grok-4.7-medium"
apply "Iris" "agent --trust --workspace $REPO --model composer-2.5"
apply "Forge" "agent --trust --workspace $REPO --model composer-2.5"
apply "Sentinel" "agent --trust --workspace $REPO --mode plan --model composer-2.5"

maestri role assign "Compass" "Planejador" 2>/dev/null || true
maestri role assign "Nexus" "Desenvolvedor Backend" 2>/dev/null || true
maestri role assign "Relay" "Desenvolvedor Worker" 2>/dev/null || true
maestri role assign "Iris" "Desenvolvedor Frontend" 2>/dev/null || true
maestri role assign "Forge" "Infra Taxi" 2>/dev/null || true
maestri role assign "Sentinel" "QA" 2>/dev/null || true

echo "== list =="
maestri list 2>&1 | head -30
echo "Modelos aplicados (Composer + Grok)."
