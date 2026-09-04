import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import { esClient } from '../src/es/client.js';
import { ensureProdutosIndex } from '../src/es/setup.js';
import { loadConfig } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadConfig();
  const applied = await runMigrations(pool, path.resolve(__dirname, '../migrations'));
  console.log(`applied migrations: ${applied.length ? applied.join(', ') : '(none pending)'}`);

  await ensureProdutosIndex(esClient, config.esIndexName);
  console.log(`ensured elasticsearch index "${config.esIndexName}" exists`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
