import { createApp } from './api/app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'api listening', port: config.port }));
});
