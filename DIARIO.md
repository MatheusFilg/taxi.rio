# Diário de bordo

Formato: uma linha (ou bloco curto) por ocorrência, cronológico.

---

## 2026-11-07

- Li o PDF do desafio (Prefeitura/Rio · Taxi.Rio simplificado) e alinhamos regras de trabalho: decisões com explicação, docs do processo no fluxo, questionar pedidos fora do enunciado.
- Sparring Maestri: notas `Arquitetura-Agentes`, `Maestro-So-Coordena`, `Validador-Cego` — Taxi-Maestri coordena; devs no canvas; 1º card `Parte1-Compose-Fundacao` (Forge). Nenhum recruit ainda.
- Human o fixou: Fastify, compose antes de K8s, UI simples, MD de estudo **no repo**, commits com co-autor, ordem Parte 1 → 2 → 3.
- Repo ainda sem `git init` e sem código de aplicação — próximo passo acordado: compose fundação (Parte 1) após fechar sparring JWT/fila/idempotência ou com defaults documentados.
- **Modelos Cursor aplicados** (1ª vez): script usou Codex — **falhou no terminal** (`prepaid_balance_exhausted`, third_party fora do weekly no plano pessoal).
- **Correção (humano + teste `agent -p`):** plano pessoal ≈ **só Composer + Grok** utilizáveis; mapa na nota canvas `Modelos-Agentes-Cursor` + script local `scripts/maestri/apply-taxi-models.sh`.
- **Modelos reaplicados** via script: Compass/Sentinel `plan`+composer; Nexus/Relay `grok-4.7-medium`; Iris/Forge `composer-2.5`.
- **Repo:** `.maestri/`, `scripts/maestri/`, `docs/WORKSPACE-AGENTES.md` fora do git (orquestração local).
- Sparring monorepo: humano escolheu **Bun + Turborepo + `packages/shared` mínimo** (JWT + fila) e **Vite + React** sem shadcn → D6/D7 em `DECISIONS.md` e `ESTUDO-DECISOES.md`.
- Sparring JWT: exemplo completo em `ESTUDO-DECISOES.md` D8; humano **OK D8** + item 8 (motorista GET qualquer corrida) → `DECISIONS.md` D8 confirmado.
- Sparring RabbitMQ **p1:** humano escolheu **direct** + 1 fila (2 routing keys); topic só se crescer famílias/eventos → **D9**.
- Sparring RabbitMQ **p2:** humano escolheu **retry (≤3) + DLQ** (`taxi.dlx` / `taxi.worker.dlq`, ack manual) → **D10**.
- Sparring idempotência **p3:** humano escolheu **C** (MySQL `Idempotency-Key` na API + dedup `event_id` no worker) → **D11**.
- Sparring cache **p4:** humano escolheu **B + invalidação** (worker SET Redis, GET com fallback MySQL, DEL no PATCH) → **D12**.
- Próximo passo: **Parte1-Compose** (monorepo Bun+Turbo + stack no compose).
- Remoto Git: **https://github.com/MatheusFilg/taxi.rio** (`origin`), push inicial da branch `master` (6 commits de processo/decisões).
