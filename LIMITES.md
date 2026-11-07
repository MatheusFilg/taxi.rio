# Limites conhecidos

Atualizar conforme o desafio avança.

---

## O que ainda não foi feito

- JWT, POST/PATCH corridas, idempotência, cache e Mongo no worker (lógica de negócio).
- Pipeline GitHub Actions.
- Partes 2 e 3 (métricas `/metrics`, OTel, alertas, k6, k8s).
- Vídeo de apresentação não gravado.

## O que foi feito (Parte1-Compose)

- Monorepo Bun+Turbo; `docker compose up` com MySQL, Redis, Mongo, RabbitMQ, Prometheus, api, worker, ui (skeleton + health).
- `/metrics` mínimo (api/worker) para scrape Prometheus; Rabbit `definitions.json` montado no compose.

## O que faríamos com mais tempo

- KEDA + demonstração no k6 (bônus Parte 3).
- Mais cenários de teste além do mínimo (feliz + 2 falhas).

## Riscos abertos

- Estouar 6–8 h antes de Parte 1 sólida — mitigação: priorizar PDF e registrar cortes aqui.
