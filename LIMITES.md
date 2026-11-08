# Limites conhecidos

Atualizar conforme o desafio avança.

---

## Parte 2 (em construção)

- **Decidido (docs):** **D13** (Tempo+Grafana, logs JSON sem Loki, OTel na cadeia) e **D14** (métrica fila opção B; alertas 5xx + fila `taxi.worker`); ordem Epic — correlation → Rabbit B → HTTP metrics → OTel → alerts → k6.
- **Pendente:** implementação dos cards (logs JSON completos, exporter/plugin Rabbit, escopo HTTP `/metrics` conforme PDF, Tempo/Grafana/OTLP, rules de alerta, k6).

## O que ainda não foi feito

- **GitHub Actions:** verde em https://github.com/MatheusFilg/taxi.rio/actions (run 42508732127, 2026-11-08).
- **Parte 3** (k8s, KEDA, bônus load); Parte 2 → ver seção em construção acima.
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

- Tempo de implementação da Parte 2 após sparring fechado — mitigação: seguir ordem Epic e registrar cortes aqui.
