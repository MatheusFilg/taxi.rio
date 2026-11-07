# Decisões de arquitetura

Formato: contexto → alternativas → escolha → trade-off.

---

## D1 — Stack da API: Fastify

- **Contexto:** Parte 1 exige API Node com JWT, REST e publicação RabbitMQ; tempo limitado (6–8 h).
- **Alternativas:** NestJS (estrutura pronta, mais curva) vs Express/Fastify (controle explícito).
- **Escolha:** **Fastify** em `api/`.
- **Trade-off:** Mais boilerplate de organização; menos “mágica” — melhor para explicar auth, validação e erros HTTP na entrevista.

---

## D2 — Ordem de infra: Docker Compose antes de Kubernetes

- **Contexto:** PDF exige `docker compose up` na Parte 1; K8s é Parte 3.
- **Alternativas:** Subir K8s cedo vs compose como ambiente único até Parte 3.
- **Escolha:** **Compose primeiro**; manifestos em `k8s/` só na Parte 3.
- **Trade-off:** Dois caminhos de deploy para manter alinhados; evita bloquear Parte 1 em cluster local.

---

## D3 — Superfície da UI

- **Contexto:** PDF pede tela mínima, não avalia design.
- **Alternativas:** UI rica vs fluxos essenciais.
- **Escolha:** **UI simples** — login, criar corrida, listar/acompanhar status (React em `ui/`).
- **Trade-off:** Menos polish; foco em JWT, perfis e fluxo feliz demonstrável.

---

## D4 — Documentação de estudo versionada

- **Contexto:** Uso de IA permitido; avaliador valoriza transparência e capacidade de explicar.
- **Alternativas:** MD privado fora do repo vs visível no repositório.
- **Escolha:** `ESTUDO-DECISOES.md` **no repo**, sem ocultar em `.gitignore`.
- **Trade-off:** Conteúdo mais informal exposto; reforça honestidade e alinhamento com README (declaração de IA).

---

## D5 — Broker (obrigatório no desafio)

- **Contexto:** PDF exige RabbitMQ; pergunta explícita se manteria outro broker do zero.
- **Alternativas:** RabbitMQ vs Kafka, NATS, Redis Streams, SQS.
- **Escolha:** **Manter RabbitMQ** para este desafio (roteamento, filas de trabalho, métricas de fila na Parte 2).
- **Trade-off:** Se fosse greenfield *sem* restrição, poderia avaliar NATS para simplicidade — aqui a restrição e o domínio “evento de corrida” favorecem Rabbit com exchange + filas dedicadas ao worker.

> *Topologia concreta (DLQ, exchange) — entrada pendente após sparring.*
