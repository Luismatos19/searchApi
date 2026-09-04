import { Pool } from 'pg';
import { loadConfig } from '../config.js';

export function createPool(connectionString: string): Pool {
  return new Pool({ connectionString });
}

export const pool = createPool(loadConfig().postgresUrl);
