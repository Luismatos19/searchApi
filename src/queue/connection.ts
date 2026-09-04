import { Redis as IORedis } from 'ioredis';

export function createQueueConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, { maxRetriesPerRequest: null });
}
