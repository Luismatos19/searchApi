export interface Config {
  postgresUrl: string;
  elasticsearchUrl: string;
  redisUrl: string;
  esIndexName: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    postgresUrl: env.POSTGRES_URL ?? 'postgres://app:app@localhost:5432/busca_produtos',
    elasticsearchUrl: env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    esIndexName: env.ES_INDEX_NAME ?? 'produtos',
    port: env.PORT ? Number(env.PORT) : 3000,
  };
}
