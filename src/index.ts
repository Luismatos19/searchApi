import { createApp } from './api/app.js';
import { loadConfig } from './config.js';
import { pool } from './db/pool.js';

const config = loadConfig();
const app = createApp();

const server = app.listen(config.port, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: config.port }));
});

async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ level: 'info', msg: 'api shutting down', signal }));
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
