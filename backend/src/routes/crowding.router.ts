/**
 * ACCESS — Crowding Router
 * GET /crowding/route/:id
 * GET /crowding/vehicle/:id
 * GET /crowding/prediction
 * POST /feedback/crowding (delegated to reports.router)
 */

import { Router } from 'express';
import { z } from 'zod';
import { estimateCrowding } from '../engines/crowding.engine.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';
import { prisma } from '../db.js';

const router = Router();

/**
 * @swagger
 * /crowding/route/{id}:
 *   get:
 *     summary: Get crowding estimate for a route
 *     tags: [Crowding]
 */
router.get('/route/:id', async (req, res, next) => {
  try {
    const crowding = await estimateCrowding(req.params.id);
    sendSuccess(res, crowding);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /crowding/vehicle/{id}:
 *   get:
 *     summary: Get crowding for a specific vehicle
 *     description: |
 *       Returns GTFS-RT occupancy if available, otherwise route-level estimate.
 *       Live occupancy is only returned if GTFS-RT provides it.
 *     tags: [Crowding]
 */
router.get('/vehicle/:id', async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        positions: {
          orderBy: { observedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      sendError(res, Errors.NOT_FOUND, 'Vehicle not found', 404);
      return;
    }

    const latestPosition = vehicle.positions[0];

    if (latestPosition && latestPosition.occupancyStatus !== 'NO_DATA_AVAILABLE') {
      sendSuccess(res, {
        occupancyStatus: latestPosition.occupancyStatus,
        source: latestPosition.source,
        observedAt: latestPosition.observedAt.toISOString(),
        status: 'confirmed',
        confidence: 0.9,
        note: 'Live occupancy from GTFS-Realtime',
      });
      return;
    }

    // Fallback to route crowding estimate
    if (vehicle.routeId) {
      const crowding = await estimateCrowding(vehicle.routeId);
      sendSuccess(res, {
        ...crowding,
        note: 'Live vehicle occupancy unavailable. Showing route-level estimate.',
      });
    } else {
      sendSuccess(res, {
        level: 'UNKNOWN',
        score: null,
        confidence: 0,
        source: 'no_data',
        status: 'unknown',
        note: 'Crowding data not available for this vehicle',
      });
    }
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /crowding/prediction:
 *   get:
 *     summary: Get historical crowding prediction for a route at a time
 *     tags: [Crowding]
 */
router.get('/prediction', async (req, res, next) => {
  try {
    const schema = z.object({
      routeId: z.string(),
      hour: z.coerce.number().min(0).max(23).optional(),
      dayOfWeek: z.coerce.number().min(0).max(6).optional(),
    });

    const { routeId, hour, dayOfWeek } = schema.parse(req.query);

    const now = new Date();
    const h = hour ?? now.getHours();
    const dow = dayOfWeek ?? ((now.getDay() + 6) % 7);

    const prediction = await prisma.crowdingPrediction.findFirst({
      where: { routeId, hourOfDay: h, dayOfWeek: dow },
    });

    if (!prediction) {
      sendSuccess(res, {
        level: 'UNKNOWN',
        score: null,
        confidence: 0,
        source: 'no_data',
        status: 'unknown',
        note: 'Insufficient historical data to make a prediction for this route/time.',
      });
      return;
    }

    sendSuccess(res, {
      level: prediction.predictedLevel,
      score: prediction.predictedScore,
      confidence: prediction.confidence,
      source: 'predictive_model',
      status: 'historical',
      sampleSize: prediction.sampleSize,
      computedAt: prediction.computedAt.toISOString(),
      validUntil: prediction.validUntil.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
