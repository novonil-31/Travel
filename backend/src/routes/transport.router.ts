/**
 * ACCESS — Shared Transport Router
 * GET /transport/stands/nearby
 * GET /transport/corridors/nearby
 * GET /transport/shared/estimate
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { haversineDistance } from '../utils/geo.js';
import { estimateSharedFare } from '../engines/fare.engine.js';
import { sendSuccess } from '../middleware/response.js';

const router = Router();

const NearbySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().min(100).max(5000).default(1000),
});

/**
 * @swagger
 * /transport/stands/nearby:
 *   get:
 *     summary: Find nearby transport stands (auto, taxi, etc.)
 *     description: |
 *       NOTE: Stand locations are sourced from OSM and demo data.
 *       Live availability is NOT available — stands are static locations.
 *     tags: [SharedTransport]
 */
router.get('/stands/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius } = NearbySchema.parse(req.query);

    const stands = await prisma.transportStand.findMany();

    const nearby = stands
      .map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.address,
        operatingHours: s.operatingHours,
        distanceM: Math.round(haversineDistance(lat, lng, s.latitude, s.longitude)),
        fare: s.typicalFareMin !== null && s.typicalFareMax !== null
          ? {
              type: 'range' as const,
              min: s.typicalFareMin,
              max: s.typicalFareMax,
              currency: s.currency,
              status: 'estimated',
              confidence: s.confidence,
            }
          : null,
        // Clearly marked: static stand location, no live availability
        liveAvailability: {
          status: 'unavailable',
          note: 'Live vehicle availability is not tracked. This shows the stand location only.',
        },
        dataStatus: s.dataStatus,
        confidence: s.confidence,
        source: s.source,
      }))
      .filter((s) => s.distanceM <= radius)
      .sort((a, b) => a.distanceM - b.distanceM);

    sendSuccess(res, nearby, 200, { count: nearby.length, radius });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /transport/corridors/nearby:
 *   get:
 *     summary: Find known shared transport corridors near a location
 *     tags: [SharedTransport]
 */
router.get('/corridors/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius } = NearbySchema.parse(req.query);

    // Corridors are area-based; we return all active ones with a note
    // In a full implementation, we'd do point-in-corridor polygon matching
    const corridors = await prisma.sharedTransportCorridor.findMany({
      where: { isActive: true },
    });

    sendSuccess(res, corridors.map((c) => ({
      id: c.id,
      name: c.name,
      fromArea: c.fromArea,
      toArea: c.toArea,
      vehicleType: c.vehicleType,
      operatingHours: c.operatingHours,
      frequencyMins: c.frequencyMins,
      fare: c.fareMin !== null && c.fareMax !== null
        ? {
            type: 'range',
            min: c.fareMin,
            max: c.fareMax,
            currency: c.currency,
            confidence: c.confidence,
            source: c.source,
            status: 'estimated',
          }
        : null,
      // No live vehicle tracking
      liveAvailability: {
        status: 'unavailable',
        note: 'Corridor is based on historical knowledge. No live vehicle tracking available.',
      },
      confidence: c.confidence,
      source: c.source,
    })), 200, {
      note: 'Corridors are based on historical shared transport patterns and may not reflect current operations.',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /transport/shared/estimate:
 *   get:
 *     summary: Estimate fare for a shared transport corridor
 *     tags: [SharedTransport]
 */
router.get('/shared/estimate', async (req, res, next) => {
  try {
    const { corridorId } = z.object({ corridorId: z.string() }).parse(req.query);

    const fare = await estimateSharedFare(corridorId);

    sendSuccess(res, {
      fare,
      note: 'This is a historical estimate based on known shared transport fares. Actual fare may vary.',
    });
  } catch (e) {
    next(e);
  }
});

export default router;
