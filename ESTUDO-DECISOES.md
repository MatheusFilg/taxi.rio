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

## D6/D7 — Monorepo Bun+Turbo e UI (decisão humana 2026-11-07)

**Por que não é “fuga” do desafio:** o PDF pede **um repo** com três superfícies; não proíbe monorepo nem runtime além de “API Node”. Bun executa o mesmo TS/JS que você explicaria em Node; nas imagens Docker documentamos `oven/bun` (ou multi-stage que você defende na entrevista).

**Árvore alvo (rascunho):**

```text
pref-rj-teste/
├── package.json          # workspaces
├── turbo.json
├── apps/api/             # Fastify
├── apps/worker/
├── apps/ui/              # Vite + React
├── packages/shared/      # JWT + eventos + tipos de domínio
└── docker-compose.yml
```

**O que entra em `packages/shared` (mínimo, não virar “framework”):**

| Conteúdo | Quem consome | Por quê |
|----------|--------------|---------|
| `JwtPayload` / perfil `passageiro` \| `motorista` | api, ui | 401/403 iguais em todo lugar |
| Envelope de evento + routing key | api (publish), worker (consume) | Fila sem copiar JSON “na mão” |
| Status da corrida + transições permitidas | api, worker, ui | PATCH e worker alinhados |
| `correlation_id` (nome/header) | api, worker | Parte 2 logs/trace |

**O que NÃO colocar no shared (evitar over-engineering):** cliente MySQL, plugins Fastify, lógica de consumer — fica nas apps.

### Como explicar Bun + Turbo em 60s

“Usei Turborepo porque API, worker e UI compartilham contrato de JWT e de mensagens Rabbit — um pacote `shared` evita publicar evento com shape diferente do que o worker consome. Bun é meu runtime habitual: compatível com ecossistema Node, acelera install e scripts locais; no Docker e no CI o pipeline é `turbo run` com o mesmo grafo que na minha máquina. Trade-off: mais arquivos na raiz; ganho organização e menos bug de integração na Parte 1.”

### Como explicar UI Vite sem shadcn em 60s

“Vite para dev rápido e build simples no compose. Sem shadcn porque o PDF não pontua design — quis telas legíveis com CSS direto e tempo em JWT, idempotência e fila.”

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
