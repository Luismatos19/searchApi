import { Queue } from 'bullmq';
import { createQueueConnection } from './connection.js';
import { loadConfig } from '../config.js';

export const PRODUTOS_SYNC_QUEUE = 'produtos-sync';

export interface ProdutoSyncJobData {
  produtoId: string;
  operacao: 'index' | 'delete';
}

const connection = createQueueConnection(loadConfig().redisUrl);

export const produtosSyncQueue = new Queue<ProdutoSyncJobData>(PRODUTOS_SYNC_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export async function enqueueIndex(produtoId: string): Promise<void> {
  await produtosSyncQueue.add('sync', { produtoId, operacao: 'index' });
}

export async function enqueueDelete(produtoId: string): Promise<void> {
  await produtosSyncQueue.add('sync', { produtoId, operacao: 'delete' });
}
