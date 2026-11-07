# Estudo para entrevista — decisões do desafio Taxi.Rio

Documento **no repositório** (transparência com avaliador + preparação para defesa em ~60 min).
Complementa `DECISIONS.md` (curto, avaliador) com narrativa e “como explicar em 60s”.

---

## Alinhamentos fixados com o humano (2026-11-07)

| # | Decisão | Implicação na entrevista |
|---|---------|--------------------------|
| 1 | MD de estudo **versionado** (não esconder no `.gitignore`) | Mostra honestidade sobre uso de IA e processo; README declara ferramentas |
| 2 | API em **Fastify** | Menos mágica que Nest; você explica middleware, plugins, validação JWT manualmente |
| 3 | **Docker Compose** primeiro; **K8s** na Parte 3 | `docker compose up` é o contrato da Parte 1; `k8s/` vem depois |
| 4 | **UI mínima** | Login + criar corrida + listar/acompanhar status; PDF não avalia design |
| 5 | Commits com **co-autor** (IA) | Histórico sem squash; mensagens explicam o *porquê* |
| 6 | Ordem do PDF | Parte 1 completa e defendável → Parte 2 → Parte 3 (+ bônus se couber no tempo) |

---

## Onde registrar o quê

| Arquivo | Público | Conteúdo |
|---------|---------|----------|
| `ESTUDO-DECISOES.md` (este) | Avaliador + você | Narrativa, perguntas da entrevista, defesa longa |
| `DECISIONS.md` | Avaliador | 3–8 entradas: contexto, alternativas, escolha, trade-off |
| `DIARIO.md` | Avaliador | Cronológico, informal, erros bem-vindos |
| `LIMITES.md` | Avaliador | O que não deu tempo, riscos abertos |

---

## Sparring ainda em aberto (não decidir sozinho)

Registrar em `DECISIONS.md` assim que você escolher:

- JWT: token estático de teste vs JWKS/chave pública
- RabbitMQ: exchange, filas, routing, DLQ
- Idempotência: `Idempotency-Key` + constraint MySQL + dedup no worker
- Cache: cache-aside no GET (API lê Redis; worker escreve)
- Cluster local Parte 3: kind vs k3d vs minikube

---

## Como explicar Fastify (rascunho)

“Escolhi Fastify pela clareza do pipeline HTTP e pelo controle explícito de validação e auth — importante para demonstrar JWT 401/403 e idempotência sem esconder lógica em decorators. O trade-off é montar mais estrutura à mão que no Nest; ganho defensabilidade na entrevista e menor tempo de ‘framework learning’ no teto de 6–8h.”
