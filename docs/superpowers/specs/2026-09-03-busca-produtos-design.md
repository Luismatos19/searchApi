# Busca de Produtos — Design

Data: 2026-09-03

## Objetivo

Sistema de busca de produtos com Postgres como fonte de verdade, Elasticsearch
como índice de busca (inverted index), sincronizado via fila BullMQ/Redis com
retry limitado. O endpoint de busca consulta apenas o Elasticsearch.

## Arquitetura

```
Cliente → API Express (TS) ──► Postgres (fonte de verdade)
                │                      │
                └─enfileira job────────┤ (após commit da transação)
                                        ▼
                                   Redis (BullMQ)
                                        │
                                        ▼
                                 Worker de sync ──► Elasticsearch (índice)

Cliente → GET /produtos/search → API Express → Elasticsearch (só leitura)
```

Monorepo simples com três processos independentes que compartilham o mesmo
código-base: **API**, **Worker**, e um script de **setup** (migration
Postgres + criação do índice ES).

Infra (`docker-compose.yml`, já existente): Postgres 16, Elasticsearch 8.15
(single-node, security desabilitada), Redis 7.

## Decisão de sincronização

Sem CDC (ex: Debezium). A própria API enfileira um job no BullMQ logo após o
commit da transação no Postgres, garantindo que nunca se tente indexar algo
que não foi persistido. Trade-off aceito: se o enfileiramento falhar (Redis
fora do ar no momento do request), a escrita no Postgres já terá sido
confirmada e ficará temporariamente fora de sincronia com o ES — mitigação
(reconciliação) fica fora de escopo por ora.

## Componentes

### 1. Postgres — tabela `produtos`

```sql
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(12,2) NOT NULL CHECK (preco > 0),
  categoria TEXT,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Migration via SQL simples, aplicada por um script de setup idempotente
(sem ORM pesado; cliente `pg` puro).

### 2. Índice Elasticsearch `produtos`

Mapping explícito:
- `nome`, `descricao`: `text` (análise padrão)
- `sku`, `categoria`: `keyword`
- `preco`: `float` (ou `scaled_float`), `quantidade_estoque`: `integer`
- `ativo`: `boolean`
- `createdAt`, `updatedAt`: `date`

Criado por script de setup idempotente (checa se o índice existe antes de
criar).

### 3. Fila BullMQ (`produtos-sync`)

Payload do job: `{ produtoId: string, operacao: 'index' | 'delete' }`.

- `attempts: 5`, backoff exponencial começando em 1s (1s, 2s, 4s, 8s, 16s).
- Após esgotar as tentativas, o job fica em `failed`, logado em nível
  `error` (jobId, produtoId, erro). Sem dead-letter queue adicional neste
  escopo.

### 4. Worker

Consome a fila `produtos-sync`.

- **`index`**: busca o produto atual no Postgres pelo `id` (não usa o
  payload do evento como dado — sempre relê a fonte de verdade, evitando
  indexar um estado desatualizado) e faz upsert no ES. Se o produto não
  existir mais no Postgres (foi deletado logo em seguida), trata como
  no-op silencioso — não é erro.
- **`delete`**: remove o documento do ES pelo id. Se o documento já não
  existir no ES, trata como no-op (idempotente).

### 5. API Express (TypeScript)

Validação de entrada com `zod`.

- `POST /produtos` — cria produto no Postgres, enfileira `index` após
  commit. 201 com o produto criado. 400 em erro de validação.
- `PUT /produtos/:id` — atualiza produto, enfileira `index`. 404 se não
  existir, 400 em validação inválida.
- `DELETE /produtos/:id` — remove do Postgres, enfileira `delete`. 404 se
  não existir, 204 em sucesso.
- `GET /produtos/search` — consulta **apenas** o Elasticsearch.
  - Query params: `q` (texto livre em nome/descrição), `categoria`,
    `precoMin`, `precoMax`, `page` (default 1), `size` (default 20).
  - Sem resultado → 200 `{ items: [], total: 0, page, size }`.
  - Erro de conexão/timeout com o ES: retry 3x com backoff curto
    (100ms, 300ms, 600ms). Esgotado o retry → 503
    `{ error: "search_unavailable" }`.
  - Erro de query malformada (bug interno, não conectividade): 500
    direto, sem retry.

Enfileirar o job de sync é fire-and-forget dentro da mesma request de
escrita — a resposta HTTP não espera o worker processar. Se o
enfileiramento em si falhar (ex: Redis indisponível), o erro é logado mas
não muda o código de resposta da escrita, já que o Postgres (fonte de
verdade) já foi gravado com sucesso.

## Observabilidade

Logs estruturados em JSON via `console` — suficiente para este escopo, sem
stack de observabilidade externa. Cobre: falhas de enfileiramento, cada
tentativa falha do worker, evento `failed` final do BullMQ, e falhas de
busca no endpoint de search.

## Testes

- **Integração da API**: contra Postgres/ES/Redis reais do
  docker-compose (sem mocks). Cobre: criar produto → aparece na busca
  (com poll curto até o worker processar), atualizar, deletar, busca sem
  resultado, filtros (categoria, faixa de preço) e paginação.
- **Worker isolado**: job de `index`/`delete` aplicado corretamente ao
  ES; comportamento de retry ao falhar a chamada ao ES.

## Fora de escopo

- Reconciliação/backfill entre Postgres e ES em caso de falha silenciosa
  no enfileiramento.
- Dead-letter queue separada para jobs esgotados.
- Autenticação/autorização na API.
- Análise de texto avançada (stemming em português, sinônimos, etc.) no
  mapping do ES.
