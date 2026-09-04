import { Client } from '@elastic/elasticsearch';
import { loadConfig } from '../config.js';

export function createEsClient(node: string): Client {
  return new Client({ node });
}

export const esClient = createEsClient(loadConfig().elasticsearchUrl);
