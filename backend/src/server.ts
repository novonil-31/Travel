/**
 * ACCESS — Main Application Server
 * Accessible Public Transport Assistant Backend
 */

import express from 'express';
import cors from 'cors';
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

export const app = express();

app.use(cors());
app.use(express.json());

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

// Health check endpoint
app.get(['/health', '/api/health'], (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    service: 'ACCESS Transport Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: config.env,
    demoMode: config.isDemoMode,
  });
});

// Mount Routes (supporting both / and /api prefix for compatibility with frontends/proxies)
const registerRoutes = (prefix: string) => {
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
};

registerRoutes('');
registerRoutes('/api');

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server if not running in serverless / test mode
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(config.port, () => {
    logger.info(`[ACCESS Backend] Running on http://localhost:${config.port}`);
    logger.info(`[ACCESS Backend] Swagger documentation available at http://localhost:${config.port}/docs`);
    startScheduler();
  });
}

export default app;
