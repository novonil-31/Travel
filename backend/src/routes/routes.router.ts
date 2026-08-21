/**
 * ACCESS — Routes Router
 * GET /routes
 * GET /routes/search
 * GET /routes/:id
 * GET /routes/:id/stops
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';
import { estimateCrowding } from '../engines/crowding.engine.js';
import { estimateFare } from '../engines/fare.engine.js';

const router = Router();

const SearchSchema = z.object({
  q: z.string().optional(),
  vehicleType: z.string().optional(),
  wheelchair: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * @swagger
 * /routes/search:
 *   get:
 *     summary: Search routes by name or type
 *     tags: [Routes]
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, vehicleType, wheelchair, limit } = SearchSchema.parse(req.query);

    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
        ...(q && { OR: [{ shortName: { contains: q } }, { longName: { contains: q } }] }),
        ...(vehicleType && { vehicleType: vehicleType as 'BUS' }),
        ...(wheelchair && { typicallyWheelchairAccessible: true }),
      },
      include: {
        agency: { select: { name: true } },
        _count: { select: { routeStops: true } },
      },
      take: limit,
      orderBy: { shortName: 'asc' },
    });

    sendSuccess(res, routes, 200, { count: routes.length });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /routes/{id}:
 *   get:
 *     summary: Get route details with crowding and fare
 *     tags: [Routes]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: {
        agency: { select: { name: true, url: true, phone: true } },
        vehicles: {
          select: {
            id: true, label: true, type: true, capacity: true,
            wheelchairAccessible: true, hasRamp: true, hasLowFloor: true,
            hasAudioAnnouncements: true, status: true,
          },
          take: 10,
        },
        _count: { select: { routeStops: true, trips: true } },
      },
    });

    if (!route) {
      sendError(res, Errors.NOT_FOUND, 'Route not found', 404);
      return;
    }

    const crowding = await estimateCrowding(route.id);
    const fare = await estimateFare(route.id);

    sendSuccess(res, {
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      description: route.description,
      vehicleType: route.vehicleType,
      color: route.color,
      isActive: route.isActive,
      agency: route.agency,
      accessibility: {
        typicallyWheelchairAccessible: route.typicallyWheelchairAccessible,
        typicallyLowFloor: route.typicallyLowFloor,
        dataStatus: route.dataStatus,
        confidence: route.confidence,
      },
      vehicles: route.vehicles,
      stopCount: route._count.routeStops,
      tripCount: route._count.trips,
      crowding: {
        level: crowding.level,
        score: crowding.score,
        confidence: crowding.confidence,
        source: crowding.source,
        status: crowding.status,
        observedAt: crowding.observedAt,
      },
      fare: {
        type: fare.type,
        exact: fare.exact,
        min: fare.min,
        max: fare.max,
        currency: fare.currency,
        confidence: fare.confidence,
        source: fare.source,
        status: fare.status,
      },
      gtfsRouteId: route.gtfsRouteId,
      dataStatus: route.dataStatus,
      retrievedAt: route.retrievedAt?.toISOString() ?? null,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /routes/{id}/stops:
 *   get:
 *     summary: Get ordered list of stops for a route
 *     tags: [Routes]
 */
router.get('/:id/stops', async (req, res, next) => {
  try {
    const routeStops = await prisma.routeStop.findMany({
      where: { routeId: req.params.id },
      include: {
        stop: {
          select: {
            id: true, name: true, latitude: true, longitude: true,
            wheelchairBoarding: true, hasRamp: true, hasLift: true,
            hasShelter: true, hasLighting: true, dataStatus: true,
          },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    if (routeStops.length === 0) {
      const exists = await prisma.route.findUnique({ where: { id: req.params.id } });
      if (!exists) {
        sendError(res, Errors.NOT_FOUND, 'Route not found', 404);
        return;
      }
    }

    sendSuccess(res, routeStops.map((rs) => ({
      sequence: rs.sequence,
      distanceAlongRoute: rs.distanceAlongRoute,
      stop: rs.stop,
    })));
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: List all active routes
 *     tags: [Routes]
 */
router.get('/', async (req, res, next) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      select: {
        id: true, shortName: true, longName: true, vehicleType: true, color: true,
        typicallyWheelchairAccessible: true, dataStatus: true,
        _count: { select: { routeStops: true } },
      },
      orderBy: { shortName: 'asc' },
    });

    sendSuccess(res, routes, 200, { count: routes.length });
  } catch (e) {
    next(e);
  }
});

export default router;
