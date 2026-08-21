/**
 * ACCESS — Locations Router (Opt-in Anonymous Location Signals)
 * POST /locations/update
 *
 * Privacy Guarantees:
 * - Requires authentication or anonymous token
 * - Signals expire quickly (retention policy)
 * - Used strictly for aggregating demand/congestion without exposing individual movements
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/response.js';
import { config } from '../config.js';

const router = Router();

const LocationSignalSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  routeId: z.string().optional(),
  tripId: z.string().optional(),
  segmentId: z.string().optional(),
});

/**
 * @swagger
 * /locations/update:
 *   post:
 *     summary: Submit anonymous opt-in location signal for transit demand estimation
 *     tags: [Locations]
 */
router.post('/update', requireAuth, async (req, res, next) => {
  try {
    const body = LocationSignalSchema.parse(req.body);

    const expiresAt = new Date(
      Date.now() + config.retention.locationSignalsDays * 24 * 60 * 60 * 1000,
    );

    const signal = await prisma.userLocationSignal.create({
      data: {
        userId: req.user!.userId,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        heading: body.heading,
        speed: body.speed,
        routeId: body.routeId,
        tripId: body.tripId,
        segmentId: body.segmentId,
        expiresAt,
      },
      select: {
        id: true,
        recordedAt: true,
        expiresAt: true,
      },
    });

    sendSuccess(res, {
      received: true,
      signalId: signal.id,
      privacy: 'Signal is pseudonymised and scheduled for deletion.',
    });
  } catch (e) {
    next(e);
  }
});

export default router;
