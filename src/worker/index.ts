import { createProdutoSyncWorker } from './produtoSyncWorker.js';

const worker = createProdutoSyncWorker();

worker.on('failed', (job, err) => {
  console.error(JSON.stringify({
    level: 'error',
    msg: 'produto sync job failed',
    jobId: job?.id,
    produtoId: job?.data?.produtoId,
    attemptsMade: job?.attemptsMade,
    error: err.message,
  }));
});

console.log('produto sync worker started');

async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ level: 'info', msg: 'worker shutting down', signal }));
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
