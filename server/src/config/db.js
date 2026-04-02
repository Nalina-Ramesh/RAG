import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export const connectDB = async () => {
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: true
  });
  logger.info('MongoDB connected');
};

