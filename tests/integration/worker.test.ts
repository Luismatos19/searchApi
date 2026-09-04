import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import { createProduto, deleteProduto } from '../../src/repositories/produtoRepository.js';
import { esClient } from '../../src/es/client.js';
import { ensureProdutosIndex } from '../../src/es/setup.js';
import { produtosSyncQueue, enqueueIndex, enqueueDelete } from '../../src/queue/queue.js';
import { createProdutoSyncWorker } from '../../src/worker/produtoSyncWorker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testIndex = 'produtos_worker_test';
let worker: ReturnType<typeof createProdutoSyncWorker>;

async function waitFor(check: () => Promise<boolean>, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('timed out waiting for condition');
}

beforeAll(async () => {
  await runMigrations(pool, path.resolve(__dirname, '../../migrations'));
  if (await esClient.indices.exists({ index: testIndex })) {
    await esClient.indices.delete({ index: testIndex });
  }
  await ensureProdutosIndex(esClient, testIndex);
  worker = createProdutoSyncWorker({ indexName: testIndex } as any);
});

afterEach(async () => {
  await pool.query('TRUNCATE produtos');
});

afterAll(async () => {
  await worker.close();
  await produtosSyncQueue.obliterate({ force: true });
  await produtosSyncQueue.close();
  await esClient.indices.delete({ index: testIndex });
  await pool.end();
});

describe('produto sync worker', () => {
  it('indexes a produto in elasticsearch when an index job runs', async () => {
    const produto = await createProduto({ sku: 'W-1', nome: 'Mouse', preco: 50 });
    await enqueueIndex(produto.id);

    await waitFor(async () => {
      try {
        const doc = await esClient.get({ index: testIndex, id: produto.id });
        return (doc._source as any).nome === 'Mouse';
      } catch {
        return false;
      }
    });
  });

  it('removes a produto from elasticsearch when a delete job runs', async () => {
    const produto = await createProduto({ sku: 'W-2', nome: 'Teclado', preco: 80 });
    await enqueueIndex(produto.id);
    await waitFor(async () => {
      try {
        await esClient.get({ index: testIndex, id: produto.id });
        return true;
      } catch {
        return false;
      }
    });

    await deleteProduto(produto.id);
    await enqueueDelete(produto.id);

    await waitFor(async () => {
      try {
        await esClient.get({ index: testIndex, id: produto.id });
        return false;
      } catch {
        return true;
      }
    });
  });
});
