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

## D8 — JWT: exemplo completo (sparring → implementação)

**Status:** **confirmado** pelo humano (2026-11-07), incluindo item 8 — motorista **GET** liberado em qualquer corrida.

### Decisões deste exemplo (pacote fechado)

| Item | Escolha no exemplo | Por quê |
|------|-------------------|---------|
| Algoritmo | **RS256** | API valida com **chave pública** no repo (PDF); privada só em dev para assinar tokens de teste |
| Validação | **`keys/test-public.pem`** versionado | Mais simples que JWKS para o desafio; JWKS = evolução opcional (mesma chave em `jwks.json`) |
| Claim de papel | **`perfil`**: `passageiro` \| `motorista` | Vocabulário do domínio (PDF); vai em `packages/shared` |
| Identidade | **`sub`**: string estável (`passageiro-ana`, `motorista-joao`) | Dono da corrida = `passageiro_id` derivado do `sub` |
| Emissão em dev | **Tokens estáticos no README** + script `mint-jwt` quando `exp` expirar | Atende “token pré-gerado”; evita POST /login no MVP |
| Lib na API | **`@fastify/jwt`** + hooks `preHandler` | Integração natural com Fastify; claims tipados via shared |
| UI | **Seletor** “Passageira teste” / “Motorista teste” (JWT já conhecido) | Mesmo fluxo mental de login; sem senha |
| Corrida de outro | **403** se autenticado e `sub` ≠ dono | Demonstra autorização além do perfil; não vaza com 404 |

### Analogia com login comum

```text
Login “de verdade”          Neste desafio (equivalente)
──────────────────          ────────────────────────────
POST /login + senha    →    README + mint-jwt OU tokens fixos
recebe access_token    →    cola/seleciona JWT na UI
Authorization: Bearer  →    igual em toda chamada à API
API valida token       →    Fastify antes das rotas
perfil/role na sessão  →    claims `perfil` + `sub` no payload
```

O worker **não** valida JWT; só a API HTTP. Eventos na fila carregam ids já decididos pela API.

### Payloads (JSON decodificado — não são segredos)

**Passageira Ana** (pode `POST /corridas`, `GET` das próprias):

```json
{
  "sub": "passageiro-ana",
  "perfil": "passageiro",
  "iss": "taxi-rio-test",
  "aud": "taxi-rio-api",
  "iat": 1762550400,
  "exp": 1794086400
}
```

**Motorista João** (pode `PATCH .../status`):

```json
{
  "sub": "motorista-joao",
  "perfil": "motorista",
  "iss": "taxi-rio-test",
  "aud": "taxi-rio-api",
  "iat": 1762550400,
  "exp": 1794086400
}
```

JWT na wire: `Base64URL(header).Base64URL(payload).assinatura_RS256` — a assinatura impede trocar `perfil` sem a privada (que **não** vai no git).

### Arquivos de chave (só teste)

```text
keys/
  test-public.pem      # commitado — API só lê este
  test-private.pem     # .gitignore + compose secret de dev — mint-jwt
```

README deve dizer explicitamente: **chaves e tokens são fictícios para avaliação**.

### Contrato em `packages/shared` (referência)

```typescript
export type Perfil = 'passageiro' | 'motorista'

export interface TaxiJwtClaims {
  sub: string
  perfil: Perfil
  iss?: string
  aud?: string
  iat?: number
  exp: number
}

export function canCreateCorrida(perfil: Perfil): boolean {
  return perfil === 'passageiro'
}

export function canPatchStatus(perfil: Perfil): boolean {
  return perfil === 'motorista'
}
```

### Matriz rota × perfil × resposta HTTP

Assume corrida `id=42` com `passageiro_id = passageiro-ana`.

| Rota | Token | Condição | HTTP |
|------|-------|----------|------|
| `POST /corridas` | ausente | — | **401** |
| `POST /corridas` | inválido/expirado | — | **401** |
| `POST /corridas` | motorista válido | — | **403** |
| `POST /corridas` | passageiro válido | + `Idempotency-Key` (outro tópico) | **201** |
| `GET /corridas` | ausente / inválido | — | **401** |
| `GET /corridas` | passageiro válido | lista só `sub` próprio | **200** |
| `GET /corridas/:id` | passageiro Ana | id 42 (dela) | **200** |
| `GET /corridas/:id` | passageiro Ana | id 99 (de `passageiro-bia`) | **403** |
| `GET /corridas/:id` | motorista válido | qualquer id (item 8 confirmado) | **200** |
| `PATCH /corridas/:id/status` | passageiro válido | — | **403** |
| `PATCH /corridas/:id/status` | motorista válido | transição válida | **200** |
| `PATCH /corridas/:id/status` | ausente / inválido | — | **401** |

### Exemplos HTTP (fluxo feliz)

**1. Passageiro cria corrida**

```http
POST /corridas HTTP/1.1
Host: localhost:3000
Authorization: Bearer <TOKEN_PASSAGEIRO_ANA>
Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Content-Type: application/json
X-Correlation-Id: req-001

{
  "origem": "Praça Seca",
  "destino": "Cinelândia"
}
```

→ **201** `{ "id": 42, "status": "SOLICITADA", "passageiro_id": "passageiro-ana", ... }`  
→ API publica `corrida.criada` no Rabbit (worker atualiza Redis/Mongo).

**2. Passageiro acompanha**

```http
GET /corridas/42 HTTP/1.1
Authorization: Bearer <TOKEN_PASSAGEIRO_ANA>
```

→ **200** (com cache Redis no GET — Parte 1).

**3. Motorista aceita**

```http
PATCH /corridas/42/status HTTP/1.1
Authorization: Bearer <TOKEN_MOTORISTA_JOAO>
Content-Type: application/json

{ "status": "ACEITA" }
```

→ **200** → evento `corrida.status_alterado`.

**4. Passageiro tenta aceitar (erro 403 do PDF)**

```http
PATCH /corridas/42/status HTTP/1.1
Authorization: Bearer <TOKEN_PASSAGEIRO_ANA>
Content-Type: application/json

{ "status": "ACEITA" }
```

→ **403** `{ "error": "FORBIDDEN", "message": "perfil passageiro não pode alterar status" }`

### `curl` para o avaliador (placeholders)

```bash
export API=http://localhost:3000
# Tokens completos vêm do README após `bun run mint-jwt` ou fixtures documentadas

# 401 sem token
curl -s -o /dev/null -w "%{http_code}\n" "$API/corridas"

# 401 lixo
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer not.a.jwt" "$API/corridas"

# 403 motorista no POST
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST -H "Authorization: Bearer $TOKEN_MOTORISTA" \
  -H "Content-Type: application/json" \
  -d '{"origem":"A","destino":"B"}' "$API/corridas"

# 201 passageiro (com idempotency)
curl -s -w "\n%{http_code}\n" \
  -X POST -H "Authorization: Bearer $TOKEN_ANA" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"origem":"A","destino":"B"}' "$API/corridas"
```

### UI mínima (mesma ideia de login)

```text
┌─────────────────────────────────────┐
│  Taxi.Rio (teste)                   │
│  Entrar como:                       │
│  ( ) Passageira Ana                 │
│  ( ) Motorista João                 │
│  [ Continuar ]                      │
│                                     │
│  (opcional) Colar JWT: [________]   │
└─────────────────────────────────────┘
        │
        ▼ localStorage: access_token
┌─────────────────────────────────────┐
│  Nova corrida | Minhas corridas     │
│  (motorista: painel de status)      │
└─────────────────────────────────────┘
```

### Perguntas que podem cair na entrevista

1. **Por que RS256 e não HS256?** — Separar emissor (privada só em dev) de validador (pública no repo); espelha IdP + API.
2. **Onde você revalida perfil?** — Hook Fastify após `jwtVerify`; helpers do `shared` nas rotas.
3. **JWT na fila?** — Não; confiança no broker + payload com ids; usuário já autenticado na borda HTTP.
4. **JWKS?** — Não obrigatório aqui; `test-public.pem` atende “chave pública”; JWKS seria o mesmo material em JSON.

### Frase de defesa (JWT, ~60 s)

“Modelei como login com Bearer, mas em dev uso tokens de teste assinados com RS256: a API só conhece a chave pública. Os claims `sub` e `perfil` diram 401 sem token, 401 inválido, 403 quando o motorista tenta criar corrida ou o passageiro altera status, e 2xx no fluxo feliz. O `sub` amarra o passageiro às próprias corridas no GET. Chaves e tokens são explicitamente de teste, documentados no README.”

---

## D9 — RabbitMQ pergunta 1: direct vs topic (confirmado)

**Sua decisão:** só **2 eventos** no domínio → **direct**; **topic** faria mais sentido com outras famílias ou muito mais tipos.

| Peça | Valor (rascunho implementável) |
|------|--------------------------------|
| Exchange | `taxi.direct` (tipo `direct`) |
| Routing keys | `corrida.criada`, `corrida.status_alterado` |
| Fila | `taxi.worker` (única) |
| Consumidor | `apps/worker` — switch por `event` no JSON |

**Como explicar escalabilidade em 30s:** “Hoje usei direct com duas routing keys fixas porque são só dois eventos — o broker roteia por nome exato e o worker usa uma fila. Se o produto ganhasse várias famílias (corrida, pagamento, notificação), eu migraria para topic ou filas por domínio; não paguei essa complexidade no MVP do desafio.”

---

## Sparring ainda em aberto (não decidir sozinho)

Registrar em `DECISIONS.md` assim que você escolher:

- ~~JWT~~ → **D8 fechado**
- ~~Exchange/fila~~ → **D9** (direct + fila única); falta **DLQ / retries**
- Idempotência: `Idempotency-Key` + constraint MySQL + dedup no worker
- Cache: cache-aside no GET (API lê Redis; worker escreve)
- Cluster local Parte 3: kind vs k3d vs minikube

---

## Como explicar Fastify (rascunho)

“Escolhi Fastify pela clareza do pipeline HTTP e pelo controle explícito de validação e auth — importante para demonstrar JWT 401/403 e idempotência sem esconder lógica em decorators. O trade-off é montar mais estrutura à mão que no Nest; ganho defensabilidade na entrevista e menor tempo de ‘framework learning’ no teto de 6–8h.”
