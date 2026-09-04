import { Worker } from 'bullmq';
import { PRODUTOS_SYNC_QUEUE, type ProdutoSyncJobData } from '../queue/queue.js';
import { createQueueConnection } from '../queue/connection.js';
import { processProdutoSyncJob } from './processor.js';
import { findProdutoById } from '../repositories/produtoRepository.js';
import { esClient } from '../es/client.js';
import { PRODUTOS_INDEX } from '../es/mapping.js';
import { loadConfig } from '../config.js';

export interface WorkerOverrides {
  indexName?: string;
}

export function createProdutoSyncWorker(overrides: WorkerOverrides = {}): Worker<ProdutoSyncJobData> {
  const connection = createQueueConnection(loadConfig().redisUrl);
  const indexName = overrides.indexName ?? PRODUTOS_INDEX;

  return new Worker<ProdutoSyncJobData>(
    PRODUTOS_SYNC_QUEUE,
    async (job) => {
      await processProdutoSyncJob(job.data, {
        findProdutoById,
        esClient: { index: esClient.index.bind(esClient), delete: esClient.delete.bind(esClient) },
        indexName,
      });
    },
    { connection }
  );
}
