/**
 * ACCESS — Safety Router
 * POST /safety/start
 * POST /safety/heartbeat
 * POST /safety/complete
 * POST /safety/emergency
 * GET  /safety/:id
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  startSafetySession,
  recordHeartbeat,
  completeSafetySession,
  triggerEmergency,
} from '../engines/safety.engine.js';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

router.use(requireAuth);

const StartSchema = z.object({
  journeyId: z.string().uuid(),
  expectedArrivalAt: z.string().datetime(),
  heartbeatIntervalMinutes: z.number().min(1).max(60).optional(),
});

/**
 * @swagger
 * /safety/start:
 *   post:
 *     summary: Start a safety monitoring session
 *     tags: [Safety]
 */
router.post('/start', async (req, res, next) => {
  try {
    const body = StartSchema.parse(req.body);

    const session = await startSafetySession({
      journeyId: body.journeyId,
      userId: req.user!.userId,
      expectedArrivalAt: new Date(body.expectedArrivalAt),
      heartbeatIntervalMinutes: body.heartbeatIntervalMinutes,
    });

    sendSuccess(res, session, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/heartbeat:
 *   post:
 *     summary: Check in (I am safe)
 *     tags: [Safety]
 */
router.post('/heartbeat', async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    const result = await recordHeartbeat(sessionId);
    if (!result) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/complete:
 *   post:
 *     summary: Mark journey as completed safely
 *     tags: [Safety]
 */
router.post('/complete', async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    const result = await completeSafetySession(sessionId);
    if (!result) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/emergency:
 *   post:
 *     summary: Manually trigger emergency (SOS)
 *     tags: [Safety]
 */
router.post('/emergency', async (req, res, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body);

    const result = await triggerEmergency(sessionId);
    if (!result) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /safety/{id}:
 *   get:
 *     summary: Get safety session status
 *     tags: [Safety]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const session = await prisma.safetySession.findUnique({
      where: { id: req.params.id },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
      },
    });

    if (!session) {
      sendError(res, Errors.NOT_FOUND, 'Safety session not found', 404);
      return;
    }

    if (session.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      sendError(res, Errors.FORBIDDEN, 'Access denied', 403);
      return;
    }

    sendSuccess(res, session);
  } catch (e) {
    next(e);
  }
});

export default router;
