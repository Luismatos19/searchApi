import express, { type Express } from 'express';
import { createProdutosRouter, type ProdutosRouterDeps } from './routes/produtos.js';
import { errorHandler } from './errorHandler.js';
import * as produtoRepository from '../repositories/produtoRepository.js';
import { enqueueIndex, enqueueDelete } from '../queue/queue.js';
import { searchProdutos } from './searchClient.js';
import { esClient } from '../es/client.js';
import { loadConfig } from '../config.js';
import type { SearchParams, SearchResult } from './searchClient.js';

export type AppDeps = ProdutosRouterDeps;

const config = loadConfig();

const defaultDeps: AppDeps = {
  repo: produtoRepository,
  queue: { enqueueIndex, enqueueDelete },
  search: (params: SearchParams): Promise<SearchResult> => searchProdutos(params, esClient, config.esIndexName),
};

export function createApp(overrides: Partial<AppDeps> = {}): Express {
  const deps: AppDeps = { ...defaultDeps, ...overrides };
  const app = express();
  app.use(express.json());
  app.use(createProdutosRouter(deps));
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
  app.use(errorHandler);
  return app;
}
