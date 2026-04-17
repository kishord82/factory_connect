/**
 * FactoryConnect API — Entry point.
 * Loads config, initializes DB pool, starts Express server.
 */

import { createPool } from '@fc/database';
import { createLogger } from '@fc/observability';

import { createApp } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: 'api', level: config.LOG_LEVEL });

  // Initialize database pool
  createPool({ connectionString: config.DATABASE_URL });

  const app = createApp();
  const port = config.PORT;

  app.listen(port, () => {
    logger.info({ port }, `FactoryConnect API listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
