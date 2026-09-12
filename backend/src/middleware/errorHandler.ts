import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

export class CustomError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export const errorHandler = (
  err: Error | CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  const details = err instanceof CustomError ? err.details : null;

  logger.error(`${req.method} ${req.originalUrl} - Error status: ${statusCode} - Message: ${message}`);
  if (err.stack && statusCode === 500) {
    logger.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
};
