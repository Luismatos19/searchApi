import { describe, it, expect, beforeAll } from 'vitest';
import { createEsClient } from '../../src/es/client.js';
import { ensureProdutosIndex } from '../../src/es/setup.js';
import { loadConfig } from '../../src/config.js';

const config = loadConfig();
const client = createEsClient(config.elasticsearchUrl);
const testIndex = 'produtos_setup_test';

describe('ensureProdutosIndex', () => {
  beforeAll(async () => {
    if (await client.indices.exists({ index: testIndex })) {
      await client.indices.delete({ index: testIndex });
    }
  });

  it('creates the index with the expected mapping', async () => {
    await ensureProdutosIndex(client, testIndex);

    const mapping = await client.indices.getMapping({ index: testIndex });
    const properties = mapping[testIndex].mappings.properties as Record<string, { type: string }>;
    expect(properties.nome.type).toBe('text');
    expect(properties.sku.type).toBe('keyword');
    expect(properties.preco.type).toBe('float');
    expect(properties.ativo.type).toBe('boolean');
  });

  it('is idempotent when the index already exists', async () => {
    await expect(ensureProdutosIndex(client, testIndex)).resolves.toBeUndefined();
  });
});
