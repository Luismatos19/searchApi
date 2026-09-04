import { describe, it, expect, vi } from 'vitest';
import { searchProdutos, SearchUnavailableError } from '../../src/api/searchClient.js';

function esResponse(items: any[], total: number) {
  return {
    hits: {
      total: { value: total },
      hits: items.map((doc) => ({ _source: doc })),
    },
  };
}

describe('searchProdutos', () => {
  it('returns items and total on success', async () => {
    const search = vi.fn().mockResolvedValue(esResponse([{ id: '1', nome: 'Mouse' }], 1));
    const result = await searchProdutos({ page: 1, size: 20 }, { search }, 'produtos');
    expect(result).toEqual({ items: [{ id: '1', nome: 'Mouse' }], total: 1, page: 1, size: 20 });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('returns an empty result with 200-shaped data when nothing matches', async () => {
    const search = vi.fn().mockResolvedValue(esResponse([], 0));
    const result = await searchProdutos({ page: 1, size: 20 }, { search }, 'produtos');
    expect(result).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });

  it('retries connection errors up to 3 times then throws SearchUnavailableError', async () => {
    const connErr = Object.assign(new Error('ECONNREFUSED'), { name: 'ConnectionError' });
    const search = vi.fn().mockRejectedValue(connErr);

    const promise = searchProdutos(
      { page: 1, size: 20 },
      { search },
      'produtos',
      { retryDelaysMs: [0, 0, 0] }
    );

    await expect(promise).rejects.toThrow(SearchUnavailableError);
    expect(search).toHaveBeenCalledTimes(4);
  });

  it('succeeds after a transient connection error retries', async () => {
    const connErr = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    const search = vi
      .fn()
      .mockRejectedValueOnce(connErr)
      .mockResolvedValueOnce(esResponse([{ id: '2', nome: 'Teclado' }], 1));

    const result = await searchProdutos(
      { page: 1, size: 20 },
      { search },
      'produtos',
      { retryDelaysMs: [0, 0, 0] }
    );
    expect(result.items).toHaveLength(1);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-connectivity errors and rethrows immediately', async () => {
    const queryErr = Object.assign(new Error('bad query'), { name: 'ResponseError' });
    const search = vi.fn().mockRejectedValue(queryErr);

    await expect(
      searchProdutos({ page: 1, size: 20 }, { search }, 'produtos', { retryDelaysMs: [0, 0, 0] })
    ).rejects.toThrow('bad query');
    expect(search).toHaveBeenCalledTimes(1);
  });
});
