import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';

const bootstrap = async () => {
  await connectDB();
  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`OpsMind API running on port ${env.PORT}`);
  });
};

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap server', error);
  process.exit(1);
});

