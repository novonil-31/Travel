/**
 * ACCESS — Vehicles Router
 * GET /vehicles/nearby
 * GET /vehicles/:id
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { haversineDistance } from '../utils/geo.js';
import { classifyVehicleFreshness } from '../utils/freshness.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';

const router = Router();

/**
 * @swagger
 * /vehicles/nearby:
 *   get:
 *     summary: Get vehicles near a coordinate
 *     description: |
 *       Only returns vehicles with known positions.
 *       Position freshness is clearly indicated.
 *       If no realtime data: returns nothing (never fakes positions).
 *     tags: [Vehicles]
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const schema = z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      radius: z.coerce.number().default(1000),
    });

    const { lat, lng, radius } = schema.parse(req.query);

    // Get latest position for each vehicle
    const positions = await prisma.vehiclePosition.findMany({
      where: {
        // Only positions retrieved in the last 15 minutes
        retrievedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      include: {
        vehicle: {
          select: {
            id: true, label: true, type: true, capacity: true,
            wheelchairAccessible: true, hasRamp: true, hasLowFloor: true, routeId: true,
            route: { select: { shortName: true, longName: true } },
          },
        },
      },
      orderBy: { observedAt: 'desc' },
      distinct: ['vehicleId'],
    });

    const nearby = positions
      .map((p) => ({
        vehicleId: p.vehicleId,
        vehicle: p.vehicle,
        position: {
          latitude: p.latitude,
          longitude: p.longitude,
          bearing: p.bearing,
          speed: p.speed,
        },
        distanceM: Math.round(haversineDistance(lat, lng, p.latitude, p.longitude)),
        occupancyStatus: p.occupancyStatus,
        freshness: classifyVehicleFreshness(p.observedAt),
        source: p.source,
        externalId: p.externalId,
        observedAt: p.observedAt.toISOString(),
      }))
      .filter((p) => p.distanceM <= radius && p.freshness.isUsable)
      .sort((a, b) => a.distanceM - b.distanceM);

    sendSuccess(res, nearby, 200, {
      count: nearby.length,
      note: nearby.length === 0
        ? 'No realtime vehicle positions available in this area.'
        : undefined,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle details and latest position
 *     tags: [Vehicles]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        route: { select: { shortName: true, longName: true } },
        positions: {
          orderBy: { observedAt: 'desc' },
          take: 1,
        },
        conditions: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { observedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      sendError(res, Errors.NOT_FOUND, 'Vehicle not found', 404);
      return;
    }

    const latestPos = vehicle.positions[0];
    const latestCondition = vehicle.conditions[0];

    sendSuccess(res, {
      id: vehicle.id,
      label: vehicle.label,
      licensePlate: vehicle.licensePlate,
      type: vehicle.type,
      capacity: vehicle.capacity,
      route: vehicle.route,
      accessibility: {
        wheelchairAccessible: vehicle.wheelchairAccessible,
        hasRamp: vehicle.hasRamp,
        hasLowFloor: vehicle.hasLowFloor,
        hasAudioAnnouncements: vehicle.hasAudioAnnouncements,
        hasVisualDisplay: vehicle.hasVisualDisplay,
      },
      position: latestPos
        ? {
            latitude: latestPos.latitude,
            longitude: latestPos.longitude,
            bearing: latestPos.bearing,
            speed: latestPos.speed,
            occupancyStatus: latestPos.occupancyStatus,
            freshness: classifyVehicleFreshness(latestPos.observedAt),
            source: latestPos.source,
            observedAt: latestPos.observedAt.toISOString(),
          }
        : {
            available: false,
            note: 'No realtime position data for this vehicle.',
            source: 'no_data',
            status: 'unknown',
          },
      condition: latestCondition
        ? {
            rampOperational: latestCondition.rampOperational,
            liftOperational: latestCondition.liftOperational,
            overallStatus: latestCondition.overallStatus,
            source: latestCondition.source,
            reportedBy: latestCondition.reportedBy,
            observedAt: latestCondition.observedAt.toISOString(),
            confidence: latestCondition.confidence,
          }
        : {
            rampOperational: 'UNKNOWN',
            liftOperational: 'UNKNOWN',
            overallStatus: 'UNKNOWN',
            note: 'No condition data available.',
          },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { route: { select: { shortName: true } } },
      take: 50,
    });
    sendSuccess(res, vehicles);
  } catch (e) {
    next(e);
  }
});

export default router;
