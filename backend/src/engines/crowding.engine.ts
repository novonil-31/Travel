/**
 * ACCESS — Crowding Engine
 * 
 * Provides crowding estimates from multiple sources, in priority order:
 *   1. GTFS-RT occupancy (realtime, if available)
 *   2. Recent user reports (last 30 min)
 *   3. Historical baseline (day-of-week × hour bucket)
 *   4. Unknown
 * 
 * RULE: Never invent crowding data. Always return source + confidence + status.
 */

import { prisma } from '../db.js';
import { dayOfWeek, isWeekend } from '../utils/geo.js';
import type { CrowdingLevel } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CrowdingEstimate {
  level: CrowdingLevel;
  score: number | null;       // 0.0–1.0 if known
  confidence: number;         // 0.0–1.0
  source: string;
  status: 'confirmed' | 'estimated' | 'historical' | 'unknown';
  observedAt: string | null;
  sampleSize: number;
}

// Map crowding level enum → numeric score for averaging
const LEVEL_TO_SCORE: Record<string, number> = {
  EMPTY: 0.05,
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.75,
  FULL: 0.95,
  UNKNOWN: 0.5,
};

const SCORE_TO_LEVEL = (score: number): CrowdingLevel => {
  if (score < 0.15) return 'EMPTY';
  if (score < 0.4) return 'LOW';
  if (score < 0.65) return 'MEDIUM';
  if (score < 0.85) return 'HIGH';
  return 'FULL';
};

// ─────────────────────────────────────────────────────────────────────────────
// Baseline computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute historical crowding baseline for a route at a specific time.
 * Uses observations stored in crowding_observations table.
 * 
 * Cold start: if insufficient data, returns status='unknown'.
 */
export async function getHistoricalBaseline(
  routeId: string,
  hourOfDay: number,
  dayOfWeekNum: number,
  isWeekendDay: boolean,
  minSamples = 5,
): Promise<CrowdingEstimate> {
  // Fetch observations within ±1 hour for robustness
  const hourRange = [Math.max(0, hourOfDay - 1), hourOfDay, Math.min(23, hourOfDay + 1)];

  const observations = await prisma.crowdingObservation.findMany({
    where: {
      routeId,
      hourOfDay: { in: hourRange },
      dayOfWeek: dayOfWeekNum,
    },
    select: { score: true, level: true, observedAt: true },
    orderBy: { observedAt: 'desc' },
    take: 100,
  });

  if (observations.length < minSamples) {
    return {
      level: 'UNKNOWN',
      score: null,
      confidence: 0,
      source: 'historical_baseline',
      status: 'unknown',
      observedAt: null,
      sampleSize: observations.length,
    };
  }

  // Average the scores
  const scores = observations
    .map((o) => o.score ?? LEVEL_TO_SCORE[o.level])
    .filter((s): s is number => s !== undefined && s !== null);

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / scores.length,
  );

  // Confidence: more samples + lower variance → higher confidence
  const sampleConfidence = Math.min(observations.length / 30, 1.0);
  const varianceConfidence = Math.max(0, 1 - stdDev * 2);
  const confidence = (sampleConfidence + varianceConfidence) / 2;

  const latestObserved = observations[0]?.observedAt ?? null;

  return {
    level: SCORE_TO_LEVEL(avgScore),
    score: Math.round(avgScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    source: 'historical_baseline',
    status: 'historical',
    observedAt: latestObserved?.toISOString() ?? null,
    sampleSize: observations.length,
  };
}

/**
 * Get recent crowding from user reports (last 30 minutes).
 */
export async function getRecentReportedCrowding(routeId: string): Promise<CrowdingEstimate | null> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const recent = await prisma.crowdingObservation.findMany({
    where: {
      routeId,
      source: { in: ['user_feedback', 'crowding_report'] },
      observedAt: { gte: thirtyMinAgo },
    },
    select: { score: true, level: true, observedAt: true },
    orderBy: { observedAt: 'desc' },
    take: 20,
  });

  if (recent.length === 0) return null;

  const scores = recent.map((o) => o.score ?? LEVEL_TO_SCORE[o.level]).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const confidence = Math.min(recent.length / 5, 0.9); // max 0.9 from user reports
  const latestObserved = recent[0]?.observedAt ?? null;

  return {
    level: SCORE_TO_LEVEL(avgScore),
    score: Math.round(avgScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    source: 'user_reports',
    status: 'estimated',
    observedAt: latestObserved?.toISOString() ?? null,
    sampleSize: recent.length,
  };
}

/**
 * Get stored crowding prediction (computed by the ML/baseline pipeline).
 */
export async function getStoredPrediction(
  routeId: string,
  hourOfDay: number,
  dayOfWeekNum: number,
): Promise<CrowdingEstimate | null> {
  const prediction = await prisma.crowdingPrediction.findUnique({
    where: {
      routeId_stopId_hourOfDay_dayOfWeek: {
        routeId,
        stopId: '',
        hourOfDay,
        dayOfWeek: dayOfWeekNum,
      },
    },
  });

  if (!prediction || prediction.validUntil < new Date()) return null;

  return {
    level: prediction.predictedLevel as CrowdingLevel,
    score: prediction.predictedScore,
    confidence: prediction.confidence,
    source: 'predictive_model',
    status: 'estimated',
    observedAt: prediction.computedAt.toISOString(),
    sampleSize: prediction.sampleSize,
  };
}

/**
 * Main crowding estimation function.
 * Tries sources in priority order, falls back gracefully.
 */
export async function estimateCrowding(
  routeId: string,
  now = new Date(),
): Promise<CrowdingEstimate> {
  const hour = now.getHours();
  const dow = dayOfWeek(now);
  const weekend = isWeekend(now);

  // Priority 1: recent user reports
  const userReports = await getRecentReportedCrowding(routeId);
  if (userReports && userReports.confidence >= 0.5) {
    return userReports;
  }

  // Priority 2: stored ML prediction
  const stored = await getStoredPrediction(routeId, hour, dow);
  if (stored) return stored;

  // Priority 3: historical baseline
  const baseline = await getHistoricalBaseline(routeId, hour, dow, weekend);
  if (baseline.status !== 'unknown') return baseline;

  // Fallback: no data
  return {
    level: 'UNKNOWN',
    score: null,
    confidence: 0,
    source: 'no_data',
    status: 'unknown',
    observedAt: null,
    sampleSize: 0,
  };
}

/**
 * Record a crowding observation (from user feedback or realtime).
 * Does NOT immediately retrain the model — aggregation happens separately.
 */
export async function recordCrowdingObservation(params: {
  routeId: string;
  tripId?: string;
  stopId?: string;
  level: CrowdingLevel;
  source: string;
  userId?: string;
  observedAt?: Date;
}): Promise<void> {
  const now = params.observedAt ?? new Date();
  const score = LEVEL_TO_SCORE[params.level] ?? 0.5;

  await prisma.crowdingObservation.create({
    data: {
      routeId: params.routeId,
      tripId: params.tripId,
      stopId: params.stopId,
      level: params.level,
      score,
      hourOfDay: now.getHours(),
      dayOfWeek: dayOfWeek(now),
      isWeekend: isWeekend(now),
      source: params.source,
      userId: params.userId,
      observedAt: now,
      confidence: params.source === 'gtfs_rt' ? 0.9 : 0.6,
    },
  });
}

/**
 * Recompute and upsert crowding predictions for all active routes.
 * Called by the ingestion scheduler. Should be run periodically, not per request.
 */
export async function recomputePredictions(): Promise<{ updated: number; skipped: number }> {
  const routes = await prisma.route.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const route of routes) {
    for (let hour = 0; hour < 24; hour++) {
      for (let dow = 0; dow < 7; dow++) {
        const isWeekendDay = dow >= 5;
        const baseline = await getHistoricalBaseline(route.id, hour, dow, isWeekendDay, 5);

        if (baseline.status === 'unknown') {
          skipped++;
          continue;
        }

        await prisma.crowdingPrediction.upsert({
          where: {
            routeId_stopId_hourOfDay_dayOfWeek: {
              routeId: route.id,
              stopId: '',
              hourOfDay: hour,
              dayOfWeek: dow,
            },
          },
          update: {
            predictedLevel: baseline.level,
            predictedScore: baseline.score ?? 0.5,
            confidence: baseline.confidence,
            sampleSize: baseline.sampleSize,
            computedAt: new Date(),
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          create: {
            routeId: route.id,
            stopId: '',
            hourOfDay: hour,
            dayOfWeek: dow,
            isWeekend: isWeekendDay,
            predictedLevel: baseline.level,
            predictedScore: baseline.score ?? 0.5,
            confidence: baseline.confidence,
            sampleSize: baseline.sampleSize,
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        updated++;
      }
    }
  }

  return { updated, skipped };
}
