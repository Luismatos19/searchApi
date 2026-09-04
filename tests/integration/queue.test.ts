import { describe, it, expect, afterAll } from 'vitest';
import {
  produtosSyncQueue,
  enqueueIndex,
  enqueueDelete,
  PRODUTOS_SYNC_QUEUE,
} from '../../src/queue/queue.js';

describe('produtosSyncQueue', () => {
  afterAll(async () => {
    await produtosSyncQueue.obliterate({ force: true });
    await produtosSyncQueue.close();
  });

  it('enqueues an index job with attempts:5 and exponential backoff', async () => {
    await enqueueIndex('produto-1');
    const jobs = await produtosSyncQueue.getJobs(['waiting', 'delayed']);
    const job = jobs.find((j) => j.data.produtoId === 'produto-1');
    expect(job).toBeDefined();
    expect(job?.data.operacao).toBe('index');
    expect(job?.opts.attempts).toBe(5);
    expect(job?.opts.backoff).toEqual({ type: 'exponential', delay: 1000 });
  });

  it('enqueues a delete job', async () => {
    await enqueueDelete('produto-2');
    const jobs = await produtosSyncQueue.getJobs(['waiting', 'delayed']);
    const job = jobs.find((j) => j.data.produtoId === 'produto-2');
    expect(job?.data.operacao).toBe('delete');
  });

  it('uses the expected queue name', () => {
    expect(PRODUTOS_SYNC_QUEUE).toBe('produtos-sync');
  });
});
