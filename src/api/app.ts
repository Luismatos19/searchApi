import express, { type Express } from 'express';
import { createProdutosRouter, type ProdutosRouterDeps } from './routes/produtos.js';
import { errorHandler } from './errorHandler.js';
import * as produtoRepository from '../repositories/produtoRepository.js';
import { enqueueIndex, enqueueDelete } from '../queue/queue.js';
import { searchProdutos } from './searchClient.js';
import { esClient } from '../es/client.js';
import { PRODUTOS_INDEX } from '../es/mapping.js';
import type { SearchParams, SearchResult } from './searchClient.js';

export type AppDeps = ProdutosRouterDeps;

const defaultDeps: AppDeps = {
  repo: produtoRepository,
  queue: { enqueueIndex, enqueueDelete },
  search: (params: SearchParams): Promise<SearchResult> => searchProdutos(params, esClient, PRODUTOS_INDEX),
};

export function createApp(overrides: Partial<AppDeps> = {}): Express {
  const deps: AppDeps = { ...defaultDeps, ...overrides };
  const app = express();
  app.use(express.json());
  app.use(createProdutosRouter(deps));
  app.use(errorHandler);
  return app;
}
