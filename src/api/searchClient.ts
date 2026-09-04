import type { ProdutoDocument } from '../es/mapping.js';

export class SearchUnavailableError extends Error {
  constructor() {
    super('search_unavailable');
    this.name = 'SearchUnavailableError';
  }
}

export interface SearchParams {
  q?: string;
  categoria?: string;
  precoMin?: number;
  precoMax?: number;
  page: number;
  size: number;
}

export interface SearchResult {
  items: ProdutoDocument[];
  total: number;
  page: number;
  size: number;
}

export interface SearchClientOptions {
  retryDelaysMs?: number[];
}

type EsSearchFn = (params: {
  index: string;
  from: number;
  size: number;
  query: unknown;
}) => Promise<{
  hits: {
    total?: number | { value: number };
    hits: Array<{ _source?: unknown }>;
  };
}>;

const DEFAULT_RETRY_DELAYS_MS = [100, 300, 600];
const RETRYABLE_ERROR_NAMES = new Set(['ConnectionError', 'TimeoutError', 'NoLivingConnectionsError']);

function isRetryable(err: unknown): boolean {
  return typeof err === 'object' && err !== null && RETRYABLE_ERROR_NAMES.has((err as Error).name);
}

function buildQuery(params: SearchParams) {
  const must: unknown[] = [];
  const filter: unknown[] = [];

  if (params.q) {
    must.push({ multi_match: { query: params.q, fields: ['nome', 'descricao'] } });
  }
  if (params.categoria) {
    filter.push({ term: { categoria: params.categoria } });
  }
  if (params.precoMin !== undefined || params.precoMax !== undefined) {
    filter.push({
      range: {
        preco: {
          ...(params.precoMin !== undefined ? { gte: params.precoMin } : {}),
          ...(params.precoMax !== undefined ? { lte: params.precoMax } : {}),
        },
      },
    });
  }

  return {
    bool: {
      must: must.length ? must : [{ match_all: {} }],
      filter,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchProdutos(
  params: SearchParams,
  esClient: { search: EsSearchFn },
  indexName: string,
  options: SearchClientOptions = {}
): Promise<SearchResult> {
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      const response = await esClient.search({
        index: indexName,
        from: (params.page - 1) * params.size,
        size: params.size,
        query: buildQuery(params),
      });
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;
      const items = response.hits.hits.map((hit: { _source?: unknown }) => hit._source as ProdutoDocument);
      return { items, total, page: params.page, size: params.size };
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) throw err;
      if (attempt < retryDelaysMs.length) {
        await sleep(retryDelaysMs[attempt]);
        continue;
      }
      throw new SearchUnavailableError();
    }
  }
  throw lastError;
}
