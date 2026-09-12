import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { morganMiddleware, logger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import researchRoutes from './routes/researchRoutes.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const app = express();

// Standard middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    if (config.allowedCorsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morganMiddleware);
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', env: config.nodeEnv });
});

// Mounting API routes
app.use('/api/research', researchRoutes);

// Catch-all route handler for unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

// Central error handler (must be last)
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Server successfully started on port ${config.port} in ${config.nodeEnv} mode`);
});

export default app;
