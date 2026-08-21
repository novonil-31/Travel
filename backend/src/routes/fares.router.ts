/**
 * ACCESS — Fares Router
 * GET /fares/estimate
 */

import { Router } from 'express';
import { z } from 'zod';
import { estimateFare } from '../engines/fare.engine.js';
import { sendSuccess } from '../middleware/response.js';

const router = Router();

const FareQuerySchema = z.object({
  routeId: z.string().optional(),
  originZoneId: z.string().optional(),
  destinationZoneId: z.string().optional(),
});

/**
 * @swagger
 * /fares/estimate:
 *   get:
 *     summary: Estimate fare for a route or zone
 *     tags: [Fares]
 */
router.get('/estimate', async (req, res, next) => {
  try {
    const { routeId, originZoneId, destinationZoneId } = FareQuerySchema.parse(req.query);

    const estimate = await estimateFare(
      routeId ?? null,
      originZoneId,
      destinationZoneId,
    );

    sendSuccess(res, estimate);
  } catch (e) {
    next(e);
  }
});

export default router;
