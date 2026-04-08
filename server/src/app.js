import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { User } from './models/user.model.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import chatRoutes from './routes/chat.routes.js';
import healthRoutes from './routes/health.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/chat', chatRoutes);

  app.post('/signup', async (req, res) => {
    try {
      logger.info('Raw signup payload received', req.body);
      const result = await User.collection.insertOne(req.body);
      res.send({ message: 'User added', data: result });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection', error);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
  });

  return app;
};

