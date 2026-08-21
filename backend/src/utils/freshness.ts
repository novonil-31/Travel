/**
 * ACCESS — Data freshness classification
 * 
 * The system MUST always tell the user whether information is live, stale, or estimated.
 * Never present old data as live.
 */

import { config } from '../config.js';

export type FreshnessCategory = 'fresh' | 'stale' | 'expired' | 'unknown';

export interface FreshnessResult {
  category: FreshnessCategory;
  ageSeconds: number | null;
  label: string;
  isUsable: boolean;
}

/**
 * Classify a timestamp as fresh/stale/expired based on configurable thresholds.
 */
export function classifyVehicleFreshness(observedAt: Date | null | undefined): FreshnessResult {
  return classify(
    observedAt,
    config.freshness.vehiclePositionFreshSec,
    config.freshness.vehiclePositionStaleSec,
  );
}

export function classifyCrowdingFreshness(observedAt: Date | null | undefined): FreshnessResult {
  return classify(
    observedAt,
    config.freshness.crowdingFreshSec,
    config.freshness.crowdingStaleSec,
  );
}

function classify(
  observedAt: Date | null | undefined,
  freshThresholdSec: number,
  staleThresholdSec: number,
): FreshnessResult {
  if (!observedAt) {
    return { category: 'unknown', ageSeconds: null, label: 'No data', isUsable: false };
  }

  const ageSeconds = (Date.now() - observedAt.getTime()) / 1000;

  if (ageSeconds <= freshThresholdSec) {
    return {
      category: 'fresh',
      ageSeconds: Math.round(ageSeconds),
      label: `${Math.round(ageSeconds)}s ago`,
      isUsable: true,
    };
  }

  if (ageSeconds <= staleThresholdSec) {
    return {
      category: 'stale',
      ageSeconds: Math.round(ageSeconds),
      label: `${Math.round(ageSeconds / 60)}min ago (stale)`,
      isUsable: true, // stale but still shown with warning
    };
  }

  return {
    category: 'expired',
    ageSeconds: Math.round(ageSeconds),
    label: `${Math.round(ageSeconds / 60)}min ago (expired)`,
    isUsable: false,
  };
}

/**
 * Build a standardised provenance block to attach to any dynamic datum.
 * The frontend should display this so users know exactly what they're looking at.
 */
export function buildProvenance(
  source: string,
  confidence: number,
  status: 'confirmed' | 'estimated' | 'historical' | 'unknown',
  observedAt?: Date | null,
) {
  return {
    source,
    confidence: Math.round(confidence * 100) / 100,
    status,
    observedAt: observedAt?.toISOString() ?? null,
    retrievedAt: new Date().toISOString(),
  };
}
