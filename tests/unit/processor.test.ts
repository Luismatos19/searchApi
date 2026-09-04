import { describe, it, expect, vi } from 'vitest';
import { processProdutoSyncJob } from '../../src/worker/processor.js';
import type { Produto } from '../../src/types.js';

const produto: Produto = {
  id: 'p1',
  sku: 'SKU-1',
  nome: 'Caneta',
  descricao: null,
  preco: 2.5,
  categoria: null,
  quantidadeEstoque: 0,
  ativo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('processProdutoSyncJob', () => {
  it('indexes the produto re-read from postgres on operacao=index', async () => {
    const findProdutoById = vi.fn().mockResolvedValue(produto);
    const index = vi.fn().mockResolvedValue({});
    const del = vi.fn();

    await processProdutoSyncJob(
      { produtoId: 'p1', operacao: 'index' },
      { findProdutoById, esClient: { index, delete: del }, indexName: 'produtos' }
    );

    expect(findProdutoById).toHaveBeenCalledWith('p1');
    expect(index).toHaveBeenCalledWith({
      index: 'produtos',
      id: 'p1',
      document: produto,
    });
    expect(del).not.toHaveBeenCalled();
  });

  it('is a no-op when the produto no longer exists in postgres', async () => {
    const findProdutoById = vi.fn().mockResolvedValue(null);
    const index = vi.fn();
    const del = vi.fn();

    await processProdutoSyncJob(
      { produtoId: 'gone', operacao: 'index' },
      { findProdutoById, esClient: { index, delete: del }, indexName: 'produtos' }
    );

    expect(index).not.toHaveBeenCalled();
  });

  it('deletes the document on operacao=delete', async () => {
    const findProdutoById = vi.fn();
    const index = vi.fn();
    const del = vi.fn().mockResolvedValue({});

    await processProdutoSyncJob(
      { produtoId: 'p1', operacao: 'delete' },
      { findProdutoById, esClient: { index, delete: del }, indexName: 'produtos' }
    );

    expect(del).toHaveBeenCalledWith({ index: 'produtos', id: 'p1' });
    expect(findProdutoById).not.toHaveBeenCalled();
  });

  it('treats a 404 on delete as a no-op, not an error', async () => {
    const notFound = Object.assign(new Error('not found'), { meta: { statusCode: 404 } });
    const del = vi.fn().mockRejectedValue(notFound);

    await expect(
      processProdutoSyncJob(
        { produtoId: 'p1', operacao: 'delete' },
        { findProdutoById: vi.fn(), esClient: { index: vi.fn(), delete: del }, indexName: 'produtos' }
      )
    ).resolves.toBeUndefined();
  });

  it('propagates other errors from the es client so bullmq retries', async () => {
    const findProdutoById = vi.fn().mockResolvedValue(produto);
    const index = vi.fn().mockRejectedValue(new Error('es down'));

    await expect(
      processProdutoSyncJob(
        { produtoId: 'p1', operacao: 'index' },
        { findProdutoById, esClient: { index, delete: vi.fn() }, indexName: 'produtos' }
      )
    ).rejects.toThrow('es down');
  });
});
