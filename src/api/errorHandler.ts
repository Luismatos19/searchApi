import type { Request, Response, NextFunction } from 'express';
import { SearchUnavailableError } from './searchClient.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof SearchUnavailableError) {
    res.status(503).json({ error: 'search_unavailable' });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  const code = (err as { code?: string } | undefined)?.code;
  if (code === '23505') {
    res.status(409).json({ error: 'duplicate_sku' });
    return;
  }
  if (code === '22P02') {
    res.status(404).json({ error: 'produto_not_found' });
    return;
  }
  console.error(JSON.stringify({ level: 'error', msg: 'unhandled api error', error: (err as Error)?.message }));
  res.status(500).json({ error: 'internal_error' });
}
