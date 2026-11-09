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

## D4 — Documentação de estudo local

- **Contexto:** Uso de IA permitido; o humano pediu narrativa longa **fora do repo** para preparar entrevista (não substitui `DECISIONS.md`).
- **Alternativas:** MD versionado (transparência total) vs **local + `.gitignore`**.
- **Escolha:** `ESTUDO-DECISOES.md` na raiz do clone, **ignorado pelo Git**; o avaliador vê só `DECISIONS.md`, `DIARIO.md`, `LIMITES.md`.
- **Trade-off:** Conteúdo de estudo não vai no push; honestidade via README (declaração de IA) e defesa oral.

---

## D5 — Broker (obrigatório no desafio)

- **Contexto:** PDF exige RabbitMQ; pergunta explícita se manteria outro broker do zero.
- **Alternativas:** RabbitMQ vs Kafka, NATS, Redis Streams, SQS.
- **Escolha:** **Manter RabbitMQ** para este desafio (roteamento, filas de trabalho, métricas de fila na Parte 2).
- **Trade-off:** Se fosse greenfield *sem* restrição, poderia avaliar NATS para simplicidade — aqui a restrição e o domínio “evento de corrida” favorecem Rabbit com exchange + filas dedicadas ao worker.

---

## D9 — RabbitMQ: exchange direct + fila única (confirmado 2026-11-07)

- **Contexto:** Dois eventos (`corrida.criada`, `corrida.status_alterado`); um worker; Parte 2 mede fila.
- **Alternativas:** **Direct** + 1 fila vs **Topic** + 1 fila vs 2 filas por tipo.
- **Escolha:** Exchange tipo **direct** (ex.: `taxi.direct`); routing keys **exatas** `corrida.criada` e `corrida.status_alterado`; **uma fila** `taxi.worker` com os dois bindings; worker distingue pelo envelope/`event` no `packages/shared`.
- **Escalabilidade (não implementado):** com mais **famílias** de eventos (ex.: `pagamento.*`, `motorista.*`) ou dezenas de tipos, **topic** + padrão `corrida.#` reduziria redesenho de bindings — YAGNI com só 2 eventos.
- **Trade-off:** Direct é mais simples e defensável no desafio; perde flexibilidade de wildcard até migrar exchange/fila.

---

## D10 — RabbitMQ: retry + DLQ (confirmado 2026-11-07)

- **Contexto:** PDF exige tolerância a duplicata (at-least-once); falhas transitórias não podem perder evento nem travar a fila para sempre.
- **Alternativas:** só requeue infinito; descartar após erro; **retry limitado + DLQ**.
- **Escolha:** **ack manual** no worker; até **3 tentativas** por mensagem (contador `x-retry-count` no header ou republicação controlada); após esgotar, **`nack` sem requeue** com fila principal configurada com **`x-dead-letter-exchange`** (`taxi.dlx`) → fila **`taxi.worker.dlq`**; operador reprocessa da DLQ manualmente no dev (sem Alertmanager).
- **Trade-off:** Duplicatas e reentregas exigem **idempotência no worker** (**D11**); DLQ cresce se bug persistir — alerta na Parte 2 justifica limiar.

---

## D11 — Idempotência: API (MySQL) + worker (confirmado 2026-11-07)

- **Contexto:** PDF: mesmo `Idempotency-Key` no `POST /corridas` não duplica corrida; worker tolera mensagem duplicada (at-least-once + **D10**).
- **Alternativas:** só banco; só aplicação; **ambos**.
- **Escolha:** **C — duas camadas:** (1) **API:** header obrigatório `Idempotency-Key` (UUID); tabela/registro com **UNIQUE** (`idempotency_key`, opcionalmente escopo `passageiro_id`/`sub`); em replay retorna **mesma resposta** (201 com mesmo body/id); (2) **Worker:** dedup por **`event_id`** (UUID no envelope da mensagem) persistido (MySQL `processed_events` ou upsert idempotente em Redis/Mongo — preferir registro explícito); reentrega do mesmo evento não altera Redis/Mongo de forma duplicada.
- **Trade-off:** Mais schema e código; defesa clara na entrevista (“onde garante?” — borda HTTP + consumidor).

---

## D12 — Cache de status: worker materializa Redis + invalidação na API (confirmado 2026-11-07)

- **Contexto:** PDF pede Redis como cache de status; fluxo API → Rabbit → worker; GET quase em tempo real.
- **Alternativas:** cache-aside só na API (A); worker escreve + API lê com fallback MySQL (B); write-through síncrono na API (C).
- **Escolha:** **B + invalidação** — **worker** faz `SET` em `corrida:{id}` após processar evento (`corrida.criada` / `corrida.status_alterado`), com histórico no Mongo; **API** no `GET` lê Redis primeiro, **fallback MySQL** em miss; em **POST/PATCH** que alteram status a API atualiza MySQL e publica evento e faz **`DEL corrida:{id}`** no Redis para não servir status velho até o worker repor.
- **Trade-off:** GET pode ir ao MySQL na janela curta pós-PATCH (correto, um pouco mais lento); defesa alinha com diagrama do desafio (projeção assíncrona no worker).

---

## D13 — Observabilidade: Tempo + Grafana, logs JSON, OTel (confirmado 2026-11-08)

- **Contexto:** Parte 2: correlação API → fila → worker, traces e logs defensáveis no compose.
- **Alternativas:** Loki/Promtail vs logs JSON no stdout; Jaeger vs **Tempo**; traces só manual vs **OTel OTLP** em api/worker.
- **Escolha:** **Grafana** com datasource **Tempo**; logs **JSON** em stdout (`docker compose logs` + `jq`/`grep`); **sem Loki**; **OpenTelemetry** exportando OTLP (trace alvo: `POST /corridas` → publish Rabbit → consumer worker); `x-correlation-id` / envelope já previstos no `packages/shared`.
- **Trade-off:** Sem busca centralizada de logs no Grafana; compose mais leve; correlação manual log↔trace via `correlation_id` / `trace_id` até drill-down no Tempo.

---

## D14 — Métricas de fila (opção B) e alertas (confirmado 2026-11-08)

- **Contexto:** PDF Parte 2: fila `taxi.worker` observável e alertas em Prometheus.
- **Alternativas:** **A** — profundidade exposta pelo worker (acoplado ao processo) vs **B** — **exporter ou plugin Prometheus no RabbitMQ**.
- **Escolha:** **Opção B**: scrape de `messages_ready` (e alinhamento em `prometheus.yml`); alertas em `observability/alerts.yml` + `observability/alerts-prometheusrule.yaml`: (1) **taxa de 5xx na API**, (2) **fila worker alta** usando métrica B; justificativa em comentário YAML.
- **Trade-off:** Mais um componente de infra; ganha métrica de fila **independente** do worker up/down (aceite do card Rabbit-Metrics-B).

---

## D8 — Autenticação JWT (confirmado 2026-11-07)

- **Contexto:** HTTP + JWT; 401/403 por perfil; token de teste; explicar chave pública; narrativa longa na nota local de estudo (D8, não versionada).
- **Alternativas:** HS256 (secret único) vs RS256; PEM vs JWKS; login real vs tokens estáticos + `mint-jwt`.
- **Escolha:** **RS256**; validação com **`keys/test-public.pem`** no repo; **tokens pré-gerados** no README + script `mint-jwt` opcional; claims **`sub` + `perfil`** (`passageiro` \| `motorista`); **`@fastify/jwt`** na API; UI com seletor de token de teste; **403** se passageiro acessa corrida de outro `sub`; **motorista** com token válido pode **GET** qualquer corrida (**200**) para acompanhar status na UI.
- **Trade-off:** Sem fluxo de senha/OAuth (fora do escopo); JWKS não implementado na v1 — PEM atende o enunciato; privada só em dev (`.gitignore`).

---

## D6 — Monorepo: Bun + Turborepo + `packages/shared`

- **Contexto:** Um repositório com `api/`, `worker/`, `ui/`; contrato JWT (claims, perfis) e eventos Rabbit (`corrida.criada`, `corrida.status_alterado`) precisam bater entre API, worker e UI; humano já usa Bun + Turbo no dia a dia.
- **Alternativas:** Três pastas soltas (A); workspaces npm/pnpm sem Turbo; Turbo sem pacote shared.
- **Escolha:** **Turborepo** na raiz; apps em `apps/api`, `apps/worker`, `apps/ui`; **runtime Bun** para API/worker (e toolchain do monorepo); **`packages/shared`** enxuto — tipos/schemas de JWT, domínio de corrida/status, payloads de mensagem, constantes (routing keys, nomes de evento).
- **Trade-off:** Setup inicial maior que monorepo “leve”; README/CI/Docker devem deixar explícito que é **Node-compatible (Bun)** — avaliador ainda vê Fastify + worker Node do PDF. Ganho: menos drift API↔worker↔UI na fila e no token; `turbo run test/lint/build` ordena o CI.

---

## D15 — Parte 3: kind + Kustomize (confirmado 2026-11-09)

- **Contexto:** PDF Parte 3 — cluster local, probes, resources, Secret/ConfigMap, sem credencial no repo.
- **Alternativas:** **k3d** / **minikube**; **Helm** (chart bitnami) vs **Kustomize** plano; deploy só apps vs stack completa.
- **Escolha:** **kind** (`k8s/kind/cluster.yaml`) com portas host **18080/13000** (conflito :8080); **Kustomize** em `k8s/base/` com deps + api/worker/ui (observabilidade Parte 2 permanece no compose); **Secret** `taxi-credentials` via `k8s/scripts/create-secrets.sh`; Rabbit no cluster sem `load_definitions` (worker declara fila).
- **Trade-off:** Sem Grafana/KEDA/Prometheus Operator neste overlay — menor superfície; `alerts-prometheusrule.yaml` fica como artefato CRD quando houver Operator; compose continua demo full-stack.

---

## D7 — Frontend: Vite + React (sem shadcn pesado)

- **Contexto:** UI mínima (D3); tempo limitado; PDF não avalia design.
- **Alternativas:** CRA; Vite + biblioteca de componentes (shadcn/Radix); Vite + CSS simples.
- **Escolha:** **Vite + React** em `apps/ui`; estilização mínima (CSS/modules ou poucas classes), **sem** shadcn/Radix como base do projeto.
- **Trade-off:** Menos componentes prontos; telas mais “cruas” e defensáveis como foco em fluxo + JWT, não em UI kit.
