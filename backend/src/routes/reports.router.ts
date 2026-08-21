/**
 * ACCESS — Reports & Feedback Router
 * POST /reports/crowding
 * POST /reports/delay
 * POST /reports/accessibility
 * POST /reports/vehicle
 * POST /feedback/crowding
 * GET  /reports (admin triage)
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';
import { recordCrowdingObservation } from '../engines/crowding.engine.js';
import { config } from '../config.js';

const router = Router();

const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function isDuplicate(
  userId: string,
  routeId: string,
  type: string,
  vehicleId?: string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);
  const existing = await prisma.report.findFirst({
    where: {
      userId,
      routeId,
      type,
      ...(vehicleId ? { vehicleId } : {}),
      createdAt: { gte: since },
    },
  });
  return !!existing;
}

const BaseReportSchema = z.object({
  routeId: z.string(),
  vehicleId: z.string().optional(),
  stopId: z.string().optional(),
  comment: z.string().max(500).optional(),
});

/**
 * @swagger
 * /reports/crowding:
 *   post:
 *     summary: Report observed crowding level on a route or vehicle
 *     tags: [Reports]
 */
router.post('/crowding', requireAuth, async (req, res, next) => {
  try {
    const body = BaseReportSchema.extend({
      level: z.enum(['EMPTY', 'LOW', 'MEDIUM', 'HIGH', 'FULL']),
    }).parse(req.body);

    const isDup = await isDuplicate(req.user!.userId, body.routeId, 'CROWDING', body.vehicleId);

    const expiresAt = new Date(Date.now() + config.retention.reportExpireHours * 3600 * 1000);

    const report = await prisma.report.create({
      data: {
        userId: req.user!.userId,
        routeId: body.routeId,
        vehicleId: body.vehicleId,
        stopId: body.stopId,
        type: 'CROWDING',
        crowdingLevel: body.level,
        comment: body.comment,
        isDuplicate: isDup,
        expiresAt,
      },
    });

    if (!isDup) {
      await recordCrowdingObservation({
        routeId: body.routeId,
        stopId: body.stopId,
        level: body.level as any,
        source: 'crowding_report',
        userId: req.user!.userId,
      });
    }

    sendSuccess(res, { reportId: report.id, isDuplicate: isDup }, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /reports/delay:
 *   post:
 *     summary: Report a route delay
 *     tags: [Reports]
 */
router.post('/delay', requireAuth, async (req, res, next) => {
  try {
    const body = BaseReportSchema.extend({
      delayMinutes: z.number().min(1).max(120),
    }).parse(req.body);

    const isDup = await isDuplicate(req.user!.userId, body.routeId, 'DELAY', body.vehicleId);

    const report = await prisma.report.create({
      data: {
        userId: req.user!.userId,
        routeId: body.routeId,
        vehicleId: body.vehicleId,
        type: 'DELAY',
        delayMinutes: body.delayMinutes,
        comment: body.comment,
        isDuplicate: isDup,
        expiresAt: new Date(Date.now() + config.retention.reportExpireHours * 3600 * 1000),
      },
    });

    sendSuccess(res, { reportId: report.id, isDuplicate: isDup }, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /reports/accessibility:
 *   post:
 *     summary: Report an accessibility issue (broken ramp, inaccessible stop, etc.)
 *     tags: [Reports]
 */
router.post('/accessibility', requireAuth, async (req, res, next) => {
  try {
    const body = BaseReportSchema.extend({
      type: z.enum(['INACCESSIBLE_VEHICLE', 'BROKEN_RAMP', 'INACCESSIBLE_STOP']),
      issue: z.string().max(200).optional(),
    }).parse(req.body);

    const isDup = await isDuplicate(req.user!.userId, body.routeId, body.type, body.vehicleId);

    const report = await prisma.report.create({
      data: {
        userId: req.user!.userId,
        routeId: body.routeId,
        vehicleId: body.vehicleId,
        stopId: body.stopId,
        type: body.type,
        accessibilityIssue: body.issue,
        comment: body.comment,
        isDuplicate: isDup,
        expiresAt: new Date(Date.now() + config.retention.reportExpireHours * 3600 * 1000),
      },
    });

    if (!isDup && body.vehicleId && body.type === 'BROKEN_RAMP') {
      await prisma.vehicleCondition.create({
        data: {
          vehicleId: body.vehicleId,
          rampOperational: 'UNAVAILABLE',
          source: 'user_report',
          reportedBy: req.user!.userId,
          confidence: 0.7,
          expiresAt: new Date(Date.now() + 4 * 3600 * 1000),
        },
      });
    }

    sendSuccess(res, { reportId: report.id, isDuplicate: isDup }, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /reports/vehicle:
 *   post:
 *     summary: Report vehicle condition or service disruption
 *     tags: [Reports]
 */
router.post('/vehicle', requireAuth, async (req, res, next) => {
  try {
    const body = BaseReportSchema.extend({
      type: z.enum(['VEHICLE_UNAVAILABLE', 'ROUTE_DISRUPTION']),
    }).parse(req.body);

    const isDup = await isDuplicate(req.user!.userId, body.routeId, body.type);

    const report = await prisma.report.create({
      data: {
        userId: req.user!.userId,
        routeId: body.routeId,
        vehicleId: body.vehicleId,
        type: body.type,
        comment: body.comment,
        isDuplicate: isDup,
        expiresAt: new Date(Date.now() + config.retention.reportExpireHours * 3600 * 1000),
      },
    });

    sendSuccess(res, { reportId: report.id, isDuplicate: isDup }, 201);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /feedback/crowding:
 *   post:
 *     summary: Submit post-journey crowding feedback
 *     tags: [Crowding]
 */
export const feedbackRouter = Router();

feedbackRouter.post('/crowding', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      journeyId: z.string().uuid().optional(),
      routeId: z.string(),
      level: z.enum(['EMPTY', 'LOW', 'MEDIUM', 'HIGH', 'FULL']),
    }).parse(req.body);

    await prisma.crowdingFeedback.create({
      data: {
        userId: req.user!.userId,
        routeId: body.routeId,
        journeyId: body.journeyId,
        level: body.level,
      },
    });

    await recordCrowdingObservation({
      routeId: body.routeId,
      level: body.level as any,
      source: 'user_feedback',
      userId: req.user!.userId,
    });

    sendSuccess(res, { message: 'Feedback recorded. Thank you!' }, 201);
  } catch (e) {
    next(e);
  }
});

export default router;
