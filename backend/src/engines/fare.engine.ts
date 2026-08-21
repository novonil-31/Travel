/**
 * ACCESS — Fare Estimation Engine
 * 
 * Priority order:
 *   1. Exact fare from GTFS fare_rules (source=gtfs, isExact=true)
 *   2. Operator fare table (source=operator)
 *   3. Historical shared-transport range (source=historical)
 *   4. Unkno — returns null
 * 
 * RULE: Never pretend an estimate is exact. Always return source + confidence.
 */

import { prisma } from '../db.js';

export interface FareEstimate {
  type: 'exact' | 'range' | 'unknown';
  exact?: number;
  min?: number;
  max?: number;
  currency: string;
  confidence: number;
  source: string;
  status: 'confirmed' | 'estimated' | 'unknown';
  notes?: string;
}

/**
 * Estimate fare for a given route (optionally from/to stop zone).
 */
export async function estimateFare(
  routeId: string | null,
  originZoneId?: string,
  destinationZoneId?: string,
): Promise<FareEstimate> {
  if (!routeId) {
    return unknown();
  }

  // Try exact match first
  const exactFare = await prisma.fare.findFirst({
    where: {
      routeId,
      isExact: true,
      ...(originZoneId && { originZoneId }),
      ...(destinationZoneId && { destinationZoneId }),
    },
    orderBy: { confidence: 'desc' },
  });

  if (exactFare?.priceExact !== null && exactFare?.priceExact !== undefined) {
    return {
      type: 'exact',
      exact: exactFare.priceExact,
      currency: exactFare.currency,
      confidence: exactFare.confidence,
      source: exactFare.source,
      status: exactFare.confidence >= 0.9 ? 'confirmed' : 'estimated',
    };
  }

  // Try range
  const rangeFare = await prisma.fare.findFirst({
    where: { routeId },
    orderBy: { confidence: 'desc' },
  });

  if (rangeFare && (rangeFare.priceMin !== null || rangeFare.priceMax !== null)) {
    return {
      type: 'range',
      min: rangeFare.priceMin ?? undefined,
      max: rangeFare.priceMax ?? undefined,
      currency: rangeFare.currency,
      confidence: rangeFare.confidence,
      source: rangeFare.source,
      status: 'estimated',
    };
  }

  return unknown();
}

/**
 * Estimate shared transport fare for a corridor.
 */
export async function estimateSharedFare(corridorId: string): Promise<FareEstimate> {
  const corridor = await prisma.sharedTransportCorridor.findUnique({
    where: { id: corridorId },
  });

  if (!corridor) return unknown();

  if (corridor.fareMin !== null && corridor.fareMax !== null) {
    return {
      type: 'range',
      min: corridor.fareMin ?? undefined,
      max: corridor.fareMax ?? undefined,
      currency: corridor.currency,
      confidence: corridor.confidence,
      source: corridor.source,
      status: 'estimated',
      notes: 'Typical fare for this shared transport corridor',
    };
  }

  return unknown();
}

function unknown(): FareEstimate {
  return {
    type: 'unknown',
    currency: 'INR',
    confidence: 0,
    source: 'no_data',
    status: 'unknown',
    notes: 'Fare information not available for this route',
  };
}
