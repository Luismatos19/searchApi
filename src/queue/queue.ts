import { Queue } from 'bullmq';
import { createQueueConnection } from './connection.js';
import { loadConfig } from '../config.js';

export const PRODUTOS_SYNC_QUEUE = 'produtos-sync';

export interface ProdutoSyncJobData {
  produtoId: string;
  operacao: 'index' | 'delete';
}

const connection = createQueueConnection(loadConfig().redisUrl);

/**
 * Factory for a produtos-sync queue bound to a given queue name. Production
 * code uses the default (shared) queue name via `produtosSyncQueue` below;
 * tests that need isolation from other test files can create their own
 * differently-named queue with this factory instead.
 */
export function createProdutosSyncQueue(queueName: string = PRODUTOS_SYNC_QUEUE): Queue<ProdutoSyncJobData> {
  return new Queue<ProdutoSyncJobData>(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
    },
  });
}

export const produtosSyncQueue = createProdutosSyncQueue();

export async function enqueueIndex(
  produtoId: string,
  queue: Queue<ProdutoSyncJobData> = produtosSyncQueue
): Promise<void> {
  await queue.add('sync', { produtoId, operacao: 'index' });
}

export async function enqueueDelete(
  produtoId: string,
  queue: Queue<ProdutoSyncJobData> = produtosSyncQueue
): Promise<void> {
  await queue.add('sync', { produtoId, operacao: 'delete' });
}
