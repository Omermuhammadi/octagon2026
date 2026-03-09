import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { connectDB } from './config/database';
import routes from './routes';
import { syncEvents } from './services/sportsDbService';

// Initialize express app
const app: Application = express();

// Security Middleware
app.use(helmet());

// CORS configuration - allow both Docker (3001) and local dev (3000)
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting — general API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

// Stricter rate limit for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Octagon Oracle API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

// Start server
const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Then start the server
    const server = app.listen(PORT, () => {
      console.log(`
🥊 Octagon Oracle API Server
============================
Environment: ${config.nodeEnv}
Port: ${PORT}
MongoDB: ${config.mongodbUri}
Frontend URL: ${config.frontendUrl}
============================
      `);

      // Non-blocking: sync UFC events from TheSportsDB on startup
      syncEvents().catch((err) => console.error('[SportsDB] Startup sync failed:', err));

      // Re-sync every 24 hours
      setInterval(() => {
        syncEvents().catch((err) => console.error('[SportsDB] Scheduled sync failed:', err));
      }, 24 * 60 * 60 * 1000);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
      // Force exit after 10s if still hanging
      setTimeout(() => process.exit(1), 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
