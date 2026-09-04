import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('uses defaults matching docker-compose when env vars are absent', () => {
    const config = loadConfig({});
    expect(config).toEqual({
      postgresUrl: 'postgres://app:app@localhost:5432/busca_produtos',
      elasticsearchUrl: 'http://localhost:9200',
      redisUrl: 'redis://localhost:6379',
      esIndexName: 'produtos',
      port: 3000,
    });
  });

  it('overrides defaults from env vars', () => {
    const config = loadConfig({
      POSTGRES_URL: 'postgres://x',
      ELASTICSEARCH_URL: 'http://es:9200',
      REDIS_URL: 'redis://r:6379',
      ES_INDEX_NAME: 'produtos_test',
      PORT: '4000',
    });
    expect(config.postgresUrl).toBe('postgres://x');
    expect(config.elasticsearchUrl).toBe('http://es:9200');
    expect(config.redisUrl).toBe('redis://r:6379');
    expect(config.esIndexName).toBe('produtos_test');
    expect(config.port).toBe(4000);
  });
});
