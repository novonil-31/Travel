/**
 * ACCESS — Journey Router
 * POST /journeys/plan   — Plan a journey (the main product endpoint)
 * POST /journeys        — Save a planned journey
 * GET  /journeys/:id   — Get journey details
 * POST /journeys/:id/start
 * POST /journeys/:id/complete
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { planJourney } from '../engines/journey.planner.js';
import { startSafetySession } from '../engines/safety.engine.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

const PlanSchema = z.object({
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    name: z.string().optional(),
  }),
  destination: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    name: z.string().optional(),
  }),
  departureTime: z.string().datetime().optional(),
  profileType: z.enum(['WHEELCHAIR', 'ELDERLY', 'VISUALLY_IMPAIRED', 'NIGHT_TRAVELLER', 'GENERAL']).optional(),
  maxWalkingM: z.number().min(50).max(2000).optional(),
  maxResults: z.number().min(1).max(10).optional(),
});

const SaveJourneySchema = z.object({
  originLat: z.number(),
  originLng: z.number(),
  destinationLat: z.number(),
  destinationLng: z.number(),
  originName: z.string(),
  destinationName: z.string(),
  routeId: z.string().optional(),
  durationMinutes: z.number(),
  profileType: z.string().optional(),
});

/**
 * @swagger
 * /journeys/plan:
 *   post:
 *     summary: Plan a journey (main ACCESS product feature)
 *     description: |
 *       Finds and ranks journey options based on the user's accessibility profile.
 *       Returns options with accessibility scores, crowding estimates, fare estimates,
 *       and human-readable explanations for each option.
 *     tags: [Journeys]
 */
router.post('/plan', async (req, res, next) => {
  try {
    const body = PlanSchema.parse(req.body);

    const result = await planJourney({
      originLat: body.origin.lat,
      originLng: body.origin.lng,
      destinationLat: body.destination.lat,
      destinationLng: body.destination.lng,
      originName: body.origin.name,
      destinationName: body.destination.name,
      departureTime: body.departureTime ? new Date(body.departureTime) : undefined,
      profileType: body.profileType,
      maxWalkingM: body.maxWalkingM,
      maxResults: body.maxResults,
    });

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /journeys:
 *   post:
 *     summary: Save a planned journey to the user's history
 *     tags: [Journeys]
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = SaveJourneySchema.parse(req.body);

    const journey = await prisma.journey.create({
      data: {
        userId: req.user!.userId,
        originLat: body.originLat,
        originLng: body.originLng,
        destinationLat: body.destinationLat,
        destinationLng: body.destinationLng,
        originName: body.originName,
        destinationName: body.destinationName,
        routeId: body.routeId,
        durationMinutes: body.durationMinutes,
        status: 'PLANNED',
      },
    });

    sendSuccess(res, journey, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /journeys/{id}:
 *   get:
 *     summary: Get journey details
 *     tags: [Journeys]
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: req.params.id },
      include: {
        segments: { orderBy: { sequence: 'asc' } },
        options: { orderBy: { rank: 'asc' } },
        safetySession: true,
      },
    });

    if (!journey) {
      sendError(res, Errors.NOT_FOUND, 'Journey not found', 404);
      return;
    }

    if (journey.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      sendError(res, Errors.FORBIDDEN, 'Access denied', 403);
      return;
    }

    sendSuccess(res, journey);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /journeys/{id}/start:
 *   post:
 *     summary: Start a journey and create a safety session
 *     tags: [Journeys]
 */
router.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    const journey = await prisma.journey.findUnique({ where: { id: req.params.id } });

    if (!journey) {
      sendError(res, Errors.NOT_FOUND, 'Journey not found', 404);
      return;
    }
    if (journey.userId !== req.user!.userId) {
      sendError(res, Errors.FORBIDDEN, 'Access denied', 403);
      return;
    }

    const now = new Date();
    const expectedArrival = new Date(now.getTime() + journey.durationMinutes * 60 * 1000);

    const [updatedJourney, safetySession] = await Promise.all([
      prisma.journey.update({
        where: { id: journey.id },
        data: { status: 'ACTIVE', startedAt: now, plannedEta: expectedArrival },
      }),
      startSafetySession({
        journeyId: journey.id,
        userId: req.user!.userId,
        expectedArrivalAt: expectedArrival,
      }),
    ]);

    sendSuccess(res, { journey: updatedJourney, safetySession });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /journeys/{id}/complete:
 *   post:
 *     summary: Mark a journey as completed
 *     tags: [Journeys]
 */
router.post('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const journey = await prisma.journey.findUnique({
      where: { id: req.params.id },
      include: { safetySession: true },
    });

    if (!journey) {
      sendError(res, Errors.NOT_FOUND, 'Journey not found', 404);
      return;
    }
    if (journey.userId !== req.user!.userId) {
      sendError(res, Errors.FORBIDDEN, 'Access denied', 403);
      return;
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.journey.update({
        where: { id: journey.id },
        data: { status: 'COMPLETED', completedAt: now },
      }),
      ...(journey.safetySession
        ? [
            prisma.safetySession.update({
              where: { id: journey.safetySession.id },
              data: { status: 'SAFE', resolvedAt: now },
            }),
          ]
        : []),
    ]);

    sendSuccess(res, { journeyId: journey.id, status: 'COMPLETED', completedAt: now });
  } catch (e) {
    next(e);
  }
});

export default router;
