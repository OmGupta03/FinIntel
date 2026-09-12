import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler.js';
import { logger } from './logger.js';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, RateLimitInfo>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const MAX_REQUESTS = 100; // Max requests per window

/**
 * Custom lightweight in-memory rate limiter middleware.
 * Shows core middleware design principles without third-party dependencies.
 */
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();

  let limitInfo = ipRequestMap.get(ip);

  // If no entry exists or window has expired, reset
  if (!limitInfo || now > limitInfo.resetTime) {
    limitInfo = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
  }

  limitInfo.count++;
  ipRequestMap.set(ip, limitInfo);

  // Set standard rate limiting headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - limitInfo.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(limitInfo.resetTime / 1000));

  if (limitInfo.count > MAX_REQUESTS) {
    logger.warn(`Rate limit exceeded for IP: ${ip} on route ${req.originalUrl}`);
    return next(new CustomError('Too many requests, please try again in 15 minutes.', 429));
  }

  next();
};
