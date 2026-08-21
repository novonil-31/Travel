/**
 * ACCESS — Admin Router
 * GET  /admin/sources
 * POST /admin/sources/:id/sync
 * GET  /admin/ingestion-runs
 * POST /admin/ml/train
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, Errors } from '../middleware/response.js';
import { recomputePredictions } from '../engines/crowding.engine.js';
import { logger } from '../logger.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

/**
 * @swagger
 * /admin/sources:
 *   get:
 *     summary: List all data sources and their status
 *     tags: [Admin]
 */
router.get('/sources', async (_req, res, next) => {
  try {
    const sources = await prisma.dataSource.findMany({
      include: {
        _count: { select: { ingestionRuns: true } },
        ingestionRuns: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { status: true, completedAt: true, recordsUpserted: true, errorMessage: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, sources);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /admin/sources/{id}/sync:
 *   post:
 *     summary: Trigger manual sync for a data source
 *     tags: [Admin]
 */
router.post('/sources/:id/sync', async (req, res, next) => {
  try {
    const source = await prisma.dataSource.findUnique({ where: { id: req.params.id } });

    if (!source) {
      sendError(res, Errors.NOT_FOUND, 'Data source not found', 404);
      return;
    }

    if (!source.isActive) {
      sendError(res, 'SOURCE_INACTIVE', 'Data source is disabled', 400);
      return;
    }

    // Create an ingestion run record (actual download happens in scheduler)
    const run = await prisma.ingestionRun.create({
      data: { sourceId: source.id, status: 'RUNNING' },
    });

    logger.info({ sourceId: source.id, runId: run.id }, 'Manual sync triggered');

    sendSuccess(res, {
      runId: run.id,
      message: 'Sync triggered. Check /admin/ingestion-runs for status.',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /admin/ingestion-runs:
 *   get:
 *     summary: List recent ingestion runs
 *     tags: [Admin]
 */
router.get('/ingestion-runs', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);

    const runs = await prisma.ingestionRun.findMany({
      include: { source: { select: { name: true, type: true } } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    sendSuccess(res, runs, 200, { count: runs.length });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /admin/ml/train:
 *   post:
 *     summary: Trigger crowding model recomputation
 *     tags: [Admin]
 */
router.post('/ml/train', async (_req, res, next) => {
  try {
    logger.info('Manual ML recomputation triggered');

    const result = await recomputePredictions();

    // Record model version
    await prisma.modelVersion.create({
      data: {
        name: `crowding_baseline_${Date.now()}`,
        description: 'Historical baseline recomputed from observations',
        datasetSize: result.updated + result.skipped,
        metrics: JSON.stringify({ updated: result.updated, skipped: result.skipped }),
        isActive: true,
        trainedAt: new Date(),
      },
    });

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
});

export default router;
