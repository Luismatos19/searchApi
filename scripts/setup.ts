import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import { esClient } from '../src/es/client.js';
import { ensureProdutosIndex } from '../src/es/setup.js';
import { PRODUTOS_INDEX } from '../src/es/mapping.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const applied = await runMigrations(pool, path.resolve(__dirname, '../migrations'));
  console.log(`applied migrations: ${applied.length ? applied.join(', ') : '(none pending)'}`);

  await ensureProdutosIndex(esClient, PRODUTOS_INDEX);
  console.log(`ensured elasticsearch index "${PRODUTOS_INDEX}" exists`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
