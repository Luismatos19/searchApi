import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import {
  createProduto,
  findProdutoById,
  updateProduto,
  deleteProduto,
} from '../../src/repositories/produtoRepository.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

beforeEach(async () => {
  await runMigrations(pool, path.resolve(__dirname, '../../migrations'));
  await pool.query('TRUNCATE produtos');
});

afterAll(async () => {
  await pool.end();
});

describe('produtoRepository', () => {
  it('creates and finds a produto', async () => {
    const created = await createProduto({ sku: 'SKU-1', nome: 'Caneta', preco: 2.5 });
    expect(created.id).toBeTruthy();
    expect(created.sku).toBe('SKU-1');
    expect(created.ativo).toBe(true);
    expect(created.quantidadeEstoque).toBe(0);

    const found = await findProdutoById(created.id);
    expect(found).toEqual(created);
  });

  it('returns null when produto does not exist', async () => {
    const found = await findProdutoById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('updates a produto', async () => {
    const created = await createProduto({ sku: 'SKU-2', nome: 'Caderno', preco: 10 });
    const updated = await updateProduto(created.id, { preco: 12.5, quantidadeEstoque: 5 });
    expect(updated?.preco).toBe(12.5);
    expect(updated?.quantidadeEstoque).toBe(5);
    expect(updated?.nome).toBe('Caderno');
  });

  it('returns null updating a nonexistent produto', async () => {
    const updated = await updateProduto('00000000-0000-0000-0000-000000000000', { preco: 1 });
    expect(updated).toBeNull();
  });

  it('deletes a produto', async () => {
    const created = await createProduto({ sku: 'SKU-3', nome: 'Lapis', preco: 1 });
    const deleted = await deleteProduto(created.id);
    expect(deleted).toBe(true);
    expect(await findProdutoById(created.id)).toBeNull();
  });

  it('returns false deleting a nonexistent produto', async () => {
    const deleted = await deleteProduto('00000000-0000-0000-0000-000000000000');
    expect(deleted).toBe(false);
  });
});
