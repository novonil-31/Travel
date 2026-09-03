/**
 * ACCESS — Stops & Places Router
 * GET /stops
 * GET /stops/nearby
 * GET /stops/places/search
 * GET /stops/places/reverse
 * GET /stops/:id
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { haversineDistance } from '../utils/geo.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';
import { searchPlacesOnline, reverseGeocodeOnline } from '../utils/onlineRouting.js';

import { searchIndiaGazetteerBackend } from '../data/indiaGazetteer.js';

const router = Router();

const NearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(50).max(5000).default(800),
  limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * @swagger
 * /stops/places/search:
 *   get:
 *     summary: Search real-world places, cities & monuments across India
 *     tags: [Stops]
 */
router.get('/places/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? req.query.query ?? '').trim();
    const userLat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
    const userLng = req.query.lng ? parseFloat(String(req.query.lng)) : undefined;

    if (!q) {
      const topDefaults = searchIndiaGazetteerBackend('', 8);
      sendSuccess(res, topDefaults.map(p => ({
        displayName: p.displayName,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        type: p.category,
        isStop: true,
        stopId: p.id,
        accessibility: {
          wheelchairBoarding: 1,
          hasRamp: p.hasRamp !== false,
        },
      })));
      return;
    }

    // 0. Search All-India Gazetteer (Instant 0ms match for 350+ cities, monuments & landmarks)
    const gazetteerMatches = searchIndiaGazetteerBackend(q, 8).map(p => ({
      displayName: p.displayName,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      type: p.category,
      isStop: true,
      stopId: p.id,
      accessibility: {
        wheelchairBoarding: 1,
        hasRamp: p.hasRamp !== false,
      },
    }));

    // 1. Search database stops
    const dbStops = await prisma.stop.findMany({
      where: { name: { contains: q } },
      take: 5,
    });

    const localResults = dbStops.map((s) => ({
      displayName: `${s.name} (Transit Stop, ${s.hasRamp ? 'Accessible' : 'Standard'})`,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      type: 'transit_stop',
      isStop: true,
      stopId: s.id,
      accessibility: {
        wheelchairBoarding: s.wheelchairBoarding,
        hasRamp: s.hasRamp,
      },
    }));

    // 2. Search online Nominatim OpenStreetMap (India) + Photon + Gemini AI with User Location Focus
    const onlineResults = await searchPlacesOnline(q, userLat, userLng);

    // Merge without duplicates and compute proximity score
    const seen = new Set<string>();
    const allResults: Array<any & { score: number }> = [];

    for (const item of [...gazetteerMatches, ...localResults, ...onlineResults]) {
      const key = `${item.lat.toFixed(3)}_${item.lng.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);

        const nameLower = (item.name || '').toLowerCase();
        const displayLower = (item.displayName || '').toLowerCase();
        let score = 0;

        if (nameLower === q.toLowerCase()) score += 1000;
        else if (nameLower.startsWith(q.toLowerCase())) score += 600;
        else if (displayLower.startsWith(q.toLowerCase())) score += 400;
        else if (nameLower.includes(q.toLowerCase())) score += 300;
        else score += 100;

        if (userLat !== undefined && userLng !== undefined) {
          const R = 6371;
          const dLat = ((item.lat - userLat) * Math.PI) / 180;
          const dLon = ((item.lng - userLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLat * Math.PI) / 180) * Math.cos((item.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const dKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          item.distanceKm = dKm;

          if (dKm <= 5) score += 800; // In immediate neighborhood / campus
          else if (dKm <= 35) score += 500; // In city
          else if (dKm <= 100) score += 250; // In district
          else if (dKm <= 300) score += 100; // In region
        }

        allResults.push({ ...item, score });
      }
    }

    // Sort by highest score first
    allResults.sort((a, b) => b.score - a.score);

    sendSuccess(res, allResults.slice(0, 10).map(({ score, ...rest }) => rest));
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /stops/places/reverse:
 *   get:
 *     summary: Reverse geocode coordinates to location name
 *     tags: [Stops]
 */
router.get('/places/reverse', async (req, res, next) => {
  try {
    const lat = parseFloat(String(req.query.lat));
    const lng = parseFloat(String(req.query.lng));

    if (isNaN(lat) || isNaN(lng)) {
      sendError(res, Errors.VALIDATION_ERROR, 'Valid lat and lng required', 400);
      return;
    }

    const name = await reverseGeocodeOnline(lat, lng);
    sendSuccess(res, { name: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /stops/nearby:
 *   get:
 *     summary: Get stops near a coordinate
 *     tags: [Stops]
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius, limit } = NearbySchema.parse(req.query);

    const stops = await prisma.stop.findMany({
      include: {
        routeStops: {
          include: {
            route: {
              select: {
                id: true, shortName: true, longName: true, vehicleType: true,
                typicallyWheelchairAccessible: true,
              },
            },
          },
        },
      },
    });

    const nearby = stops
      .map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        latitude: s.latitude,
        longitude: s.longitude,
        distanceM: Math.round(haversineDistance(lat, lng, s.latitude, s.longitude)),
        accessibility: {
          wheelchairBoarding: s.wheelchairBoarding,
          hasRamp: s.hasRamp,
          hasLift: s.hasLift,
          hasStairs: s.hasStairs,
          hasShelter: s.hasShelter,
          hasLighting: s.hasLighting,
          hasTactilePaving: s.hasTactilePaving,
          confidence: s.confidence,
          dataStatus: s.dataStatus,
        },
        routes: s.routeStops.map((rs) => ({
          id: rs.route.id,
          shortName: rs.route.shortName,
          longName: rs.route.longName,
          vehicleType: rs.route.vehicleType,
          wheelchairAccessible: rs.route.typicallyWheelchairAccessible,
          sequence: rs.sequence,
        })),
        osmNodeId: s.osmNodeId,
        dataStatus: s.dataStatus,
        confidence: s.confidence,
        retrievedAt: s.retrievedAt?.toISOString() ?? null,
      }))
      .filter((s) => s.distanceM <= radius)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, limit);

    sendSuccess(res, nearby, 200, {
      count: nearby.length,
      radius,
      center: { lat, lng },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /stops/{id}:
 *   get:
 *     summary: Get stop details with serving routes
 *     tags: [Stops]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const stop = await prisma.stop.findUnique({
      where: { id: req.params.id },
      include: {
        routeStops: {
          include: {
            route: {
              select: {
                id: true, shortName: true, longName: true, vehicleType: true,
                typicallyWheelchairAccessible: true, typicallyLowFloor: true, isActive: true,
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!stop) {
      sendError(res, Errors.NOT_FOUND, 'Stop not found', 404);
      return;
    }

    sendSuccess(res, {
      id: stop.id,
      name: stop.name,
      code: stop.code,
      description: stop.description,
      latitude: stop.latitude,
      longitude: stop.longitude,
      accessibility: {
        wheelchairBoarding: stop.wheelchairBoarding,
        hasRamp: stop.hasRamp,
        hasLift: stop.hasLift,
        hasStairs: stop.hasStairs,
        hasShelter: stop.hasShelter,
        hasLighting: stop.hasLighting,
        hasTactilePaving: stop.hasTactilePaving,
        hasAudioAids: stop.hasAudioAids,
        confidence: stop.confidence,
        dataStatus: stop.dataStatus,
      },
      routes: stop.routeStops.map((rs) => rs.route),
      osmNodeId: stop.osmNodeId,
      gtfsStopId: stop.gtfsStopId,
      dataStatus: stop.dataStatus,
      retrievedAt: stop.retrievedAt?.toISOString() ?? null,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /stops:
 *   get:
 *     summary: Search stops by name
 *     tags: [Stops]
 */
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 50);

    const stops = await prisma.stop.findMany({
      where: q ? { name: { contains: q } } : {},
      select: {
        id: true, name: true, code: true, latitude: true, longitude: true,
        wheelchairBoarding: true, hasRamp: true, dataStatus: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, stops, 200, { count: stops.length });
  } catch (e) {
    next(e);
  }
});

export default router;
