import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import { esClient } from '../../src/es/client.js';
import { ensureProdutosIndex } from '../../src/es/setup.js';
import { produtosSyncQueue } from '../../src/queue/queue.js';
import { createProdutoSyncWorker } from '../../src/worker/produtoSyncWorker.js';
import { createApp } from '../../src/api/app.js';
import { SearchUnavailableError } from '../../src/api/searchClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testIndex = 'produtos_api_test';
let worker: ReturnType<typeof createProdutoSyncWorker>;

async function waitFor(check: () => Promise<boolean>, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('timed out waiting for condition');
}

beforeEach(async () => {
  await runMigrations(pool, path.resolve(__dirname, '../../migrations'));
  await pool.query('TRUNCATE produtos');
  if (await esClient.indices.exists({ index: testIndex })) {
    await esClient.indices.delete({ index: testIndex });
  }
  await ensureProdutosIndex(esClient, testIndex);
  await esClient.indices.refresh({ index: testIndex });
});

afterAll(async () => {
  if (worker) await worker.close();
  await produtosSyncQueue.obliterate({ force: true });
  await produtosSyncQueue.close();
  await pool.end();
});

describe('POST /produtos', () => {
  it('creates a produto and returns 201', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/produtos')
      .send({ sku: 'A-1', nome: 'Mouse', preco: 50 });
    expect(res.status).toBe(201);
    expect(res.body.sku).toBe('A-1');
  });

  it('returns 400 for an invalid payload', async () => {
    const app = createApp();
    const res = await request(app).post('/produtos').send({ nome: 'Mouse' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /produtos/:id and DELETE /produtos/:id', () => {
  it('updates an existing produto', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/produtos')
      .send({ sku: 'A-2', nome: 'Teclado', preco: 80 });

    const res = await request(app)
      .put(`/produtos/${created.body.id}`)
      .send({ preco: 90 });
    expect(res.status).toBe(200);
    expect(res.body.preco).toBe(90);
  });

  it('returns 404 updating a nonexistent produto', async () => {
    const app = createApp();
    const res = await request(app)
      .put('/produtos/00000000-0000-0000-0000-000000000000')
      .send({ preco: 1 });
    expect(res.status).toBe(404);
  });

  it('deletes an existing produto and returns 204', async () => {
    const app = createApp();
    const created = await request(app)
      .post('/produtos')
      .send({ sku: 'A-3', nome: 'Monitor', preco: 500 });

    const res = await request(app).delete(`/produtos/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 deleting a nonexistent produto', async () => {
    const app = createApp();
    const res = await request(app).delete('/produtos/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('GET /produtos/search', () => {
  it('returns an empty list with 200 when nothing matches', async () => {
    const app = createApp({ search: (params) => import('../../src/api/searchClient.js').then((m) =>
      m.searchProdutos(params, esClient, testIndex)
    ) });
    const res = await request(app).get('/produtos/search').query({ q: 'inexistente' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });

  it('finds a produto end-to-end after the worker indexes it', async () => {
    worker = createProdutoSyncWorker({ indexName: testIndex } as any);
    const app = createApp({ search: (params) => import('../../src/api/searchClient.js').then((m) =>
      m.searchProdutos(params, esClient, testIndex)
    ) });

    const created = await request(app)
      .post('/produtos')
      .send({ sku: 'A-4', nome: 'Webcam HD', preco: 150, categoria: 'eletronicos' });

    await waitFor(async () => {
      await esClient.indices.refresh({ index: testIndex });
      const res = await request(app).get('/produtos/search').query({ q: 'Webcam' });
      return res.body.total === 1;
    });

    const filtered = await request(app)
      .get('/produtos/search')
      .query({ categoria: 'eletronicos', precoMin: 100, precoMax: 200, page: 1, size: 10 });
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.items[0].id).toBe(created.body.id);
  });

  it('returns 503 when the search backend is unavailable after retries', async () => {
    const app = createApp({ search: () => Promise.reject(new SearchUnavailableError()) });
    const res = await request(app).get('/produtos/search');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'search_unavailable' });
  });
});
