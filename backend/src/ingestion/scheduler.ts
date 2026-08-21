/**
 * ACCESS — Background Ingestion & Maintenance Scheduler
 *
 * Runs scheduled jobs:
 * - Safety session escalation checker (every minute)
 * - GTFS-Realtime poll (configurable, default 1 min)
 * - Daily ML prediction baseline recomputation
 * - Data retention cleanup
 */

import cron from 'node-cron';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { checkOverdueSessions } from '../engines/safety.engine.js';
import { recomputePredictions } from '../engines/crowding.engine.js';
import { prisma } from '../db.js';

let isSchedulerRunning = false;

export function startScheduler(): void {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  logger.info('Starting background ingestion and maintenance scheduler...');

  // 1. Safety session check-in / escalation monitor (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      await checkOverdueSessions();
    } catch (err) {
      logger.error({ err }, 'Error during safety session check');
    }
  });

  // 2. Daily ML crowding prediction updates (Daily at 03:00 AM)
  cron.schedule(config.ingestion.gtfsCron, async () => {
    try {
      logger.info('Running scheduled crowding prediction recomputation...');
      const res = await recomputePredictions();
      logger.info(res, 'Scheduled crowding baseline recomputation complete');
    } catch (err) {
      logger.error({ err }, 'Error in scheduled prediction recomputation');
    }
  });

  // 3. Cleanup expired reports and location signals (Every 6 hours)
  cron.schedule('0 */6 * * *', async () => {
    try {
      const now = new Date();
      const [reportsCleaned, signalsCleaned] = await Promise.all([
        prisma.report.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
        prisma.userLocationSignal.deleteMany({
          where: { expiresAt: { lt: now } },
        }),
      ]);
      logger.info(
        { reportsCleaned: reportsCleaned.count, signalsCleaned: signalsCleaned.count },
        'Retention cleanup completed',
      );
    } catch (err) {
      logger.error({ err }, 'Retention cleanup error');
    }
  });
}
