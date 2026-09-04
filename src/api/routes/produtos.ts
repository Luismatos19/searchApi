import { Router } from 'express';
import type { Produto, NovoProdutoInput, AtualizaProdutoInput } from '../../types.js';
import type { SearchParams, SearchResult } from '../searchClient.js';
import { novoProdutoSchema, atualizaProdutoSchema, searchQuerySchema } from '../validation.js';

export interface ProdutosRouterDeps {
  repo: {
    createProduto: (input: NovoProdutoInput) => Promise<Produto>;
    findProdutoById: (id: string) => Promise<Produto | null>;
    updateProduto: (id: string, input: AtualizaProdutoInput) => Promise<Produto | null>;
    deleteProduto: (id: string) => Promise<boolean>;
  };
  queue: {
    enqueueIndex: (produtoId: string) => Promise<void>;
    enqueueDelete: (produtoId: string) => Promise<void>;
  };
  search: (params: SearchParams) => Promise<SearchResult>;
}

export function createProdutosRouter(deps: ProdutosRouterDeps): Router {
  const router = Router();

  router.post('/produtos', async (req, res, next) => {
    const parsed = novoProdutoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
      return;
    }
    try {
      const produto = await deps.repo.createProduto(parsed.data);
      deps.queue.enqueueIndex(produto.id).catch((err) =>
        console.error(JSON.stringify({ level: 'error', msg: 'failed to enqueue index job', produtoId: produto.id, error: (err as Error)?.message }))
      );
      res.status(201).json(produto);
    } catch (err) {
      next(err);
    }
  });

  router.put('/produtos/:id', async (req, res, next) => {
    const parsed = atualizaProdutoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
      return;
    }
    try {
      const produto = await deps.repo.updateProduto(req.params.id, parsed.data);
      if (!produto) {
        res.status(404).json({ error: 'produto_not_found' });
        return;
      }
      deps.queue.enqueueIndex(produto.id).catch((err) =>
        console.error(JSON.stringify({ level: 'error', msg: 'failed to enqueue index job', produtoId: produto.id, error: (err as Error)?.message }))
      );
      res.status(200).json(produto);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/produtos/:id', async (req, res, next) => {
    try {
      const deleted = await deps.repo.deleteProduto(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'produto_not_found' });
        return;
      }
      deps.queue.enqueueDelete(req.params.id).catch((err) =>
        console.error(JSON.stringify({ level: 'error', msg: 'failed to enqueue delete job', produtoId: req.params.id, error: (err as Error)?.message }))
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.get('/produtos/search', async (req, res, next) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_error', details: parsed.error.flatten() });
      return;
    }
    try {
      const result = await deps.search(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
