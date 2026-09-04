import type { Client } from '@elastic/elasticsearch';
import type { Produto } from '../types.js';
import type { ProdutoSyncJobData } from '../queue/queue.js';

export interface ProcessorDeps {
  findProdutoById: (id: string) => Promise<Produto | null>;
  esClient: { index: Client['index']; delete: Client['delete'] };
  indexName: string;
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'meta' in err &&
    (err as { meta?: { statusCode?: number } }).meta?.statusCode === 404
  );
}

export async function processProdutoSyncJob(
  data: ProdutoSyncJobData,
  deps: ProcessorDeps
): Promise<void> {
  if (data.operacao === 'index') {
    const produto = await deps.findProdutoById(data.produtoId);
    if (!produto) return;
    await deps.esClient.index({
      index: deps.indexName,
      id: produto.id,
      document: produto,
    });
    return;
  }

  try {
    await deps.esClient.delete({ index: deps.indexName, id: data.produtoId });
  } catch (err) {
    if (isNotFoundError(err)) return;
    throw err;
  }
}
