import { describe, it, expect, afterAll } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import { loadConfig } from '../../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../migrations');
const pool = createPool(loadConfig().postgresUrl);

describe('runMigrations', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('creates the produtos table', async () => {
    await runMigrations(pool, migrationsDir);

    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'produtos'`
    );
    const columns = result.rows.map((r) => r.column_name).sort();
    expect(columns).toEqual(
      [
        'ativo',
        'categoria',
        'created_at',
        'descricao',
        'id',
        'nome',
        'preco',
        'quantidade_estoque',
        'sku',
        'updated_at',
      ].sort()
    );
  });

  it('is idempotent when run twice', async () => {
    await runMigrations(pool, migrationsDir);
    await expect(runMigrations(pool, migrationsDir)).resolves.toBeDefined();
  });
});
