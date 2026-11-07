# Limites conhecidos

Atualizar conforme o desafio avança.

---

## O que ainda não foi feito

- Partes 2 e 3 (métricas avançadas, logs JSON/trace_id completos, OTel, alertas, k6, k8s, KEDA).
- Vídeo de apresentação não gravado.
- OpenAPI/Swagger na API (portal dedicado pendente).
- Retry worker republica manualmente (não usa delayed plugin Rabbit); DLQ após 3 falhas.

## O que foi feito (Parte 1)

- Compose completo; JWT RS256; POST/PATCH/GET `/corridas`; idempotência HTTP; cache Redis (worker SET + DEL na API).
- Worker: dedup `processed_events`, Mongo `eventos`, Redis projeção, D10 retry/DLQ básico.
- UI mínima (token, criar, GET, motorista PATCH).
- CI GitHub Actions: lint, test, build apps + imagens docker.
- Testes: health + auth 401/403 + integração opcional `INTEGRATION=1`.

## O que faríamos com mais tempo

- KEDA + demonstração no k6 (bônus Parte 3).
- E2E Probe automatizado no Maestri a cada Shipped de UI.

## Riscos abertos

- Estourar 6–8 h antes de Parte 2 sólida — mitigação: priorizar PDF e registrar cortes aqui.
