import { ApiError } from '../utils/api-error.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (error, req, res, next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details
    });
  }

  if (error?.name === 'MulterError') {
    return res.status(400).json({
      message: error.message
    });
  }

  if (error?.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      message: error.message
    });
  }

  if (error.name === 'ZodError') {
    return res.status(400).json({ message: 'Validation failed', details: error.issues });
  }

  return res.status(500).json({
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

