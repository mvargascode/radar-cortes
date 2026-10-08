import { createApp } from './app.factory.js';
import { config } from './config.js';

const app = await createApp();
await app.listen(config.port);
console.log(`API escuchando en http://localhost:${config.port}/api`);
