import { Worker } from 'bullmq';
import { PRODUTOS_SYNC_QUEUE, type ProdutoSyncJobData } from '../queue/queue.js';
import { createQueueConnection } from '../queue/connection.js';
import { processProdutoSyncJob } from './processor.js';
import { findProdutoById } from '../repositories/produtoRepository.js';
import { esClient } from '../es/client.js';
import { loadConfig } from '../config.js';

export interface WorkerOverrides {
  indexName?: string;
  queueName?: string;
}

/**
 * NOTE: correctness (always writing the freshest Postgres state to ES)
 * depends on running a single worker process at the default BullMQ
 * concurrency (1). See README.md for details — this is not enforced here.
 */
export function createProdutoSyncWorker(overrides: WorkerOverrides = {}): Worker<ProdutoSyncJobData> {
  const config = loadConfig();
  const connection = createQueueConnection(config.redisUrl);
  const indexName = overrides.indexName ?? config.esIndexName;
  const queueName = overrides.queueName ?? PRODUTOS_SYNC_QUEUE;

  return new Worker<ProdutoSyncJobData>(
    queueName,
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
