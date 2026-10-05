/**
 * ACCESS — Main Application Server
 * Accessible Public Transport Assistant Backend
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { sendSuccess } from './middleware/response.js';
import { startScheduler } from './ingestion/scheduler.js';

// Import routers
import authRouter from './routes/auth.router.js';
import profileRouter from './routes/profile.router.js';
import stopsRouter from './routes/stops.router.js';
import routesRouter from './routes/routes.router.js';
import vehiclesRouter from './routes/vehicles.router.js';
import journeysRouter from './routes/journeys.router.js';
import crowdingRouter from './routes/crowding.router.js';
import faresRouter from './routes/fares.router.js';
import transportRouter from './routes/transport.router.js';
import safetyRouter from './routes/safety.router.js';
import reportsRouter, { feedbackRouter } from './routes/reports.router.js';
import notificationsRouter from './routes/notifications.router.js';
import locationsRouter from './routes/locations.router.js';
import accessibilityRouter from './routes/accessibility.router.js';
import adminRouter from './routes/admin.router.js';
import carpoolsRouter from './routes/carpools.router.js';

export const app = express();

// Trust reverse proxy (Vercel, Nginx, AWS ELB) so express-rate-limit identifies client IP correctly
app.set('trust proxy', 1);

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Removed unsafe-eval
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// 2. Controlled CORS Whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || !config.isProduction || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// 3. Body parser size limits (Prevent memory exhaustion DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Rate Limiting Setup (Skipped during automated test runs)
const isTestEnv = process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    data: null,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    },
  },
});

export const sosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    data: null,
    error: {
      code: 'SOS_RATE_LIMIT_EXCEEDED',
      message: 'Too many emergency SOS requests. Please use native carrier dispatch (112 / SMS).',
    },
  },
});

export const planLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    success: false,
    data: null,
    error: {
      code: 'PLAN_RATE_LIMIT_EXCEEDED',
      message: 'Too many journey planning requests. Please wait a few minutes.',
    },
  },
});

app.use(globalLimiter);

// Swagger Docs Configuration
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ACCESS Public Transport Assistant API',
      version: '1.0.0',
      description:
        'Production backend for accessible, safe, and transparent public transit planning.',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});

// Swagger UI Route
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint (does not leak environment details in production)
app.get(['/health', '/api/health'], (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    service: 'ACCESS Transport Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ...(config.isProduction ? {} : { env: config.env, demoMode: config.isDemoMode }),
  });
});

const registerRoutes = (prefix: string) => {
  // Apply targeted rate limits to sensitive abuse vectors
  app.use(`${prefix}/auth/login`, authLimiter);
  app.use(`${prefix}/auth/register`, authLimiter);
  app.use(`${prefix}/safety/emergency-sms`, sosLimiter);
  app.use(`${prefix}/journeys/plan`, planLimiter);

  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/profile`, profileRouter);
  app.use(`${prefix}/stops`, stopsRouter);
  app.use(`${prefix}/routes`, routesRouter);
  app.use(`${prefix}/vehicles`, vehiclesRouter);
  app.use(`${prefix}/journeys`, journeysRouter);
  app.use(`${prefix}/crowding`, crowdingRouter);
  app.use(`${prefix}/fares`, faresRouter);
  app.use(`${prefix}/transport`, transportRouter);
  app.use(`${prefix}/safety`, safetyRouter);
  app.use(`${prefix}/reports`, reportsRouter);
  app.use(`${prefix}/notifications`, notificationsRouter);
  app.use(`${prefix}/locations`, locationsRouter);
  app.use(`${prefix}/accessibility`, accessibilityRouter);
  app.use(`${prefix}/admin`, adminRouter);
  app.use(`${prefix}/feedback`, feedbackRouter);
  app.use(`${prefix}/carpools`, carpoolsRouter);
};

registerRoutes('');
registerRoutes('/api');

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Process crash safeguards (Prevent silent crash and unhandled promise aborts)
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '[Process] Unhandled promise rejection intercepted');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, '[Process] Uncaught exception intercepted');
});

// Start server if not running in serverless / test mode
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    logger.info(`[ACCESS Backend] Running on http://localhost:${config.port}`);
    logger.info(`[ACCESS Backend] Swagger documentation available at http://localhost:${config.port}/docs`);
    startScheduler();
  });
}

export default app;
