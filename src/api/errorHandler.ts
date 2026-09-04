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
  console.error(JSON.stringify({ level: 'error', msg: 'unhandled api error', error: (err as Error)?.message }));
  res.status(500).json({ error: 'internal_error' });
}
