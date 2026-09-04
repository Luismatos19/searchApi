import type { Client } from '@elastic/elasticsearch';
import { produtosIndexMapping } from './mapping.js';

export async function ensureProdutosIndex(client: Client, indexName: string): Promise<void> {
  const exists = await client.indices.exists({ index: indexName });
  if (exists) return;

  await client.indices.create({
    index: indexName,
    mappings: produtosIndexMapping,
  });
}
