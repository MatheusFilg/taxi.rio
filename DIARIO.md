# Diário de bordo

Formato: uma linha (ou bloco curto) por ocorrência, cronológico.

---

## 2026-11-07

- Li o PDF do desafio (Prefeitura/Rio · Taxi.Rio simplificado) e alinhamos regras de trabalho: decisões com explicação, docs do processo no fluxo, questionar pedidos fora do enunciado.
- Sparring Maestri: notas `Arquitetura-Agentes`, `Maestro-So-Coordena`, `Validador-Cego` — Taxi-Maestri coordena; devs no canvas; 1º card `Parte1-Compose-Fundacao` (Forge). Nenhum recruit ainda.
- Human o fixou: Fastify, compose antes de K8s, UI simples, MD de estudo **no repo**, commits com co-autor, ordem Parte 1 → 2 → 3.
- Repo ainda sem `git init` e sem código de aplicação — próximo passo acordado: compose fundação (Parte 1) após fechar sparring JWT/fila/idempotência ou com defaults documentados.
- **Modelos Cursor aplicados** (1ª vez): script usou Codex — **falhou no terminal** (`prepaid_balance_exhausted`, third_party fora do weekly no plano pessoal).
- **Correção (humano + teste `agent -p`):** plano pessoal ≈ **só Composer + Grok** utilizáveis; mapa revisto na nota `Modelos-Agentes-Cursor` e em `scripts/maestri/apply-taxi-models.sh` (Nexus/Relay `grok-4.7-medium`; Iris/Forge/Maestro `composer-2.5`; Compass/Sentinel `plan`+composer; Probe `grok-4.7-low-fast`).
