# busca-produtos

Product search system: Postgres (source of truth) + Elasticsearch (search index)
synced via a BullMQ/Redis worker.

## Run

```bash
docker compose up -d
cp .env.example .env
npm install
npm run setup       # runs Postgres migrations + creates the ES index
npm run dev:api      # starts the REST API on :3000
npm run dev:worker   # starts the sync worker (separate process)
```

## Endpoints

- `POST /produtos` — create a produto
- `PUT /produtos/:id` — update a produto
- `DELETE /produtos/:id` — delete a produto
- `GET /produtos/search?q=&categoria=&precoMin=&precoMax=&page=&size=` — search (Elasticsearch only)

## Tests

```bash
docker compose up -d
npm test
```

See `docs/superpowers/specs/2026-09-03-busca-produtos-design.md` for the full design.

## Concurrency assumption

The sync worker assumes a single worker process at default BullMQ concurrency (1).
Running multiple worker replicas or increasing per-worker concurrency can cause
out-of-order writes to Elasticsearch for the same produto id, since jobs are not
currently version-guarded.
