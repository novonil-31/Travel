/**
 * ACCESS — Fares Router
 * GET /fares/estimate
 */

import { Router } from 'express';
import { z } from 'zod';
import { estimateFare } from '../engines/fare.engine.js';
import { sendSuccess } from '../middleware/response.js';
import { 
  searchLiveInternetTrain, 
  searchLiveInternetFlight, 
  searchLiveInternetBus 
} from '../services/liveMultiModalAiExtractor.service.js';

const router = Router();

const FareQuerySchema = z.object({
  routeId: z.string().optional(),
  originZoneId: z.string().optional(),
  destinationZoneId: z.string().optional(),
});

const LiveTransitQuerySchema = z.object({
  type: z.enum(['train', 'flight', 'bus']),
  origin: z.string().min(2),
  destination: z.string().min(2),
  date: z.string().optional(),
  time: z.string().optional(),
  originCity: z.string().optional(),
  destCity: z.string().optional(),
  distanceKm: z.coerce.number().optional(),
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

/**
 * @swagger
 * /fares/live-transit:
 *   get:
 *     summary: Fetch real-time live internet ticket prices for trains, flights, and buses
 *     tags: [Fares]
 */
router.get('/live-transit', async (req, res, next) => {
  try {
    const { type, origin, destination, date, originCity, destCity, distanceKm } = LiveTransitQuerySchema.parse(req.query);
    const orig = origin.toUpperCase();
    const dest = destination.toUpperCase();
    const travelDate = date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const origC = originCity || origin;
    const destC = destCity || destination;
    const dist = distanceKm || 400;

    if (type === 'train') {
      const trainResult = await searchLiveInternetTrain(
        orig,
        dest,
        origC,
        destC,
        travelDate,
        dist,
      );
      return sendSuccess(res, trainResult);
    }

    if (type === 'flight') {
      const flightResult = await searchLiveInternetFlight(
        orig,
        dest,
        origC,
        destC,
        travelDate,
        dist,
      );
      return sendSuccess(res, flightResult);
    }

    if (type === 'bus') {
      const busResult = await searchLiveInternetBus(
        origC,
        destC,
        travelDate,
        dist,
      );
      return sendSuccess(res, busResult);
    }

    sendSuccess(res, null);
  } catch (e) {
    next(e);
  }
});

export default router;
