import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { env } from './config/env';
import { healthRouter } from './routes/index';
import apiRouter from './routes/index';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ── CORS Configuration ────────────────────────────────────────────────────────
const allowedOrigins = ['http://localhost:5173'];
if (env.FRONTEND_URL) {
  allowedOrigins.push(env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or test requests with no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    // Do not log health check requests to reduce noise.
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
// Health check is mounted at /health (outside /api/v1) so Render can reach it
// without version prefix. This matches the architecture document.
app.use('/health', healthRouter);

// Versioned API routes — business feature routes will be added here in later phases.
app.use('/api/v1', apiRouter);

// ── 404 & error handling ──────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
