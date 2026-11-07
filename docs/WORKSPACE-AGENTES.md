# Workspace: debate fechado (Cursor + Maestri)

Síntese para não conflitar **Taxi-Maestri** (canvas) com **assistente no Cursor** (este projeto).

## Duas camadas, um repo

| Camada | Quem | Faz | Não faz |
|--------|------|-----|---------|
| **Maestri / Taxi** | Taxi-Maestri | Kanban, `maestri ask`, recruit Compass/Nexus/Relay/Iris/Forge/Sentinel, Probe cego | Código em `api/`, `worker/`, `ui/` |
| **Cursor** | Assistente contigo | Implementação no repo, commits co-autorados, `DECISIONS`/`DIARIO`/`ESTUDO`, questionar fugas ao PDF | Decidir sozinho sem sua escolha em sparring |

**Regra de ouro:** decisões técnicas → você escolhe → `ESTUDO-DECISOES.md` + `DECISIONS.md` → aí implementa (Cursor ou agente delegado no Maestri).

## Time Parte 1 (Maestri — recrutar só quando você pedir)

| Agente | Pasta | Foco |
|--------|-------|------|
| Compass | Backlog, decisões | Cards, sparring JWT/fila |
| Nexus | `api/` | Fastify, JWT, MySQL, publish |
| Relay | `worker/` | Consumer, Redis, Mongo |
| Iris | `ui/` | UI mínima React |
| Forge | compose, CI | `Parte1-Compose-Fundacao` **primeiro** |
| Sentinel | Review | QA técnico |
| Probe (efêmero) | — | E2E cego (Validador Externo) |

## Ordem de execução (PDF + nota Arquitetura-Agentes)

1. Fichários kanban no canvas (quando montar Maestri).
2. **Card 1:** `Parte1-Compose-Fundacao` — MySQL, Redis, Mongo, Rabbit, placeholders API/worker/UI.
3. Sparring → `DECISIONS.md`: JWT, RabbitMQ, idempotência, cache.
4. Nexus + Relay + Iris em paralelo **após** compose estável.
5. Testes + GitHub Actions (Parte 1).
6. Parte 2 (`observability/`, `loadtest/`) → Parte 3 (`k8s/`).

## Decisões do humano (2026-11-07) — fechadas

1. `ESTUDO-DECISOES.md` no repositório (transparência).
2. **Fastify** na API.
3. **Docker** antes de **K8s**.
4. **UI simples**.
5. Commits com **co-autor** (IA), sem squash.
6. **Parte 1 primeiro**, depois melhorias nas Partes 2–3 conforme PDF.

## Próximo passo sugerido

`git init` + primeiro commit de processo; em seguida implementar **compose fundação** (Forge no Maestri **ou** você manda “Decisão: começar Parte1-Compose” aqui no Cursor).
