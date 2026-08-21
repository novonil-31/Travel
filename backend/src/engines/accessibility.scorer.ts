/**
 * ACCESS — Accessibility Scoring Engine
 * 
 * Produces a weighted accessibility score (0.0–1.0) based on the user's
 * accessibility profile vs. the route/vehicle/stop characteristics.
 * 
 * Also generates a human-readable explanation so the frontend can tell
 * the user WHY this route was recommended.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessibilityProfile {
  requiresWheelchair: boolean;
  requiresLowFloor: boolean;
  requiresAudioAids: boolean;
  requiresVisualAids: boolean;
  stairs: 'AVOID' | 'ACCEPTABLE';
  walkingToleranceM: number;
  crowdingPref: 'AVOID' | 'LOW_PREFERENCE' | 'ACCEPTABLE';
  safetyPref: 'NIGHT_SAFE_ONLY' | 'WELL_LIT_ONLY' | 'PREFER_BUSY_STOPS' | 'NONE';
  nightTravelOk: boolean;
  // Score weights (should sum to 1.0)
  weightAccessibility: number;
  weightSafety: number;
  weightCrowding: number;
  weightReliability: number;
  weightTime: number;
  weightCost: number;
}

export interface RouteCharacteristics {
  wheelchairAccessible: boolean;    // vehicle has ramp/low-floor
  hasRamp: boolean;
  hasLowFloor: boolean;
  hasAudioAnnouncements: boolean;
  hasVisualDisplay: boolean;
  stopHasRamp: boolean;             // origin stop accessible
  stopHasLift: boolean;
  stopHasStairs: boolean;
  stopHasLighting: boolean;
  stopWheelchairBoarding: number;   // 0=unknown, 1=yes, 2=no
  walkingDistanceM: number;
  hasStairsInPath: boolean;         // e.g. pedestrian underpass
  isNightRoute: boolean;
  stopHasShelter: boolean;
  crowdingLevel: 'EMPTY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL' | 'UNKNOWN';
  crowdingScore: number | null;     // 0.0–1.0 (higher = more crowded)
  reliability: number;              // 0.0–1.0 (higher = more reliable)
  delayMinutes: number;
  fareEstimateINR: number | null;
  travelTimeMinutes: number;
}

export interface AccessibilityScoreResult {
  // Component scores (0.0–1.0, higher = better)
  accessibilityScore: number;
  safetyScore: number;
  crowdingScore: number;
  reliabilityScore: number;
  timeScore: number;
  costScore: number;
  // Weighted overall
  overallScore: number;
  // Human-readable
  explanation: string[];
  warnings: string[];
  recommendation: 'RECOMMENDED' | 'ACCEPTABLE' | 'NOT_RECOMMENDED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring functions
// ─────────────────────────────────────────────────────────────────────────────

function scoreAccessibility(profile: AccessibilityProfile, route: RouteCharacteristics): {
  score: number;
  notes: string[];
  warnings: string[];
} {
  let score = 1.0;
  const notes: string[] = [];
  const warnings: string[] = [];

  // Wheelchair requirement — hard constraint
  if (profile.requiresWheelchair) {
    if (!route.wheelchairAccessible) {
      score = 0.0;
      warnings.push('Vehicle is NOT wheelchair accessible');
    } else if (route.hasRamp) {
      notes.push('Wheelchair ramp available');
    } else if (route.hasLowFloor) {
      notes.push('Low-floor bus (step-free)');
    }

    // Stop boarding
    if (route.stopWheelchairBoarding === 2) {
      score = Math.min(score, 0.1);
      warnings.push('Stop does NOT support wheelchair boarding');
    } else if (route.stopWheelchairBoarding === 1) {
      notes.push('Stop supports wheelchair boarding');
    }
  }

  // Stairs constraint
  if (profile.stairs === 'AVOID') {
    if (route.hasStairsInPath) {
      score *= 0.4;
      warnings.push('Route involves stairs');
    } else {
      notes.push('No stairs on this route');
    }
    if (route.stopHasStairs && !route.stopHasLift && !route.stopHasRamp) {
      score *= 0.5;
      warnings.push('Stop has stairs without lift/ramp');
    }
  }

  // Walking tolerance
  const walkRatio = route.walkingDistanceM / profile.walkingToleranceM;
  if (walkRatio > 1.5) {
    score *= 0.4;
    warnings.push(`Walking distance ${Math.round(route.walkingDistanceM)}m exceeds your tolerance`);
  } else if (walkRatio > 1.0) {
    score *= 0.7;
    warnings.push(`Walking distance ${Math.round(route.walkingDistanceM)}m is above your preference`);
  } else {
    const walkStr = route.walkingDistanceM < 100
      ? 'Minimal walking (<100m)'
      : `${Math.round(route.walkingDistanceM)}m walking`;
    notes.push(walkStr);
  }

  // Audio aids
  if (profile.requiresAudioAids && !route.hasAudioAnnouncements) {
    score *= 0.7;
    warnings.push('No audio announcements on this vehicle');
  } else if (profile.requiresAudioAids && route.hasAudioAnnouncements) {
    notes.push('Audio stop announcements available');
  }

  // Visual aids
  if (profile.requiresVisualAids && !route.hasVisualDisplay) {
    score *= 0.7;
    warnings.push('No visual display on this vehicle');
  } else if (profile.requiresVisualAids && route.hasVisualDisplay) {
    notes.push('Visual display board available');
  }

  return { score: Math.max(0, Math.min(1, score)), notes, warnings };
}

function scoreSafety(profile: AccessibilityProfile, route: RouteCharacteristics): {
  score: number;
  notes: string[];
  warnings: string[];
} {
  let score = 0.8; // base
  const notes: string[] = [];
  const warnings: string[] = [];

  const isNight = route.isNightRoute;

  if (isNight && !profile.nightTravelOk) {
    score *= 0.3;
    warnings.push('You have indicated night travel is not preferred');
  }

  if (profile.safetyPref === 'NIGHT_SAFE_ONLY' && isNight) {
    if (route.stopHasLighting) {
      score = Math.min(score * 1.2, 1.0);
      notes.push('Stop is well-lit');
    } else {
      score *= 0.5;
      warnings.push('Stop may not be well-lit at night');
    }
  }

  if (profile.safetyPref === 'WELL_LIT_ONLY') {
    if (route.stopHasLighting) {
      notes.push('Stop has lighting');
    } else {
      score *= 0.6;
      warnings.push('Stop lighting information unavailable');
    }
  }

  if (route.stopHasShelter) {
    notes.push('Sheltered stop');
    score = Math.min(score + 0.1, 1.0);
  }

  return { score: Math.max(0, Math.min(1, score)), notes, warnings };
}

function scoreCrowding(profile: AccessibilityProfile, route: RouteCharacteristics): {
  score: number;
  notes: string[];
  warnings: string[];
} {
  const notes: string[] = [];
  const warnings: string[] = [];

  const crowdingMap: Record<string, number> = {
    EMPTY: 1.0,
    LOW: 0.9,
    MEDIUM: 0.65,
    HIGH: 0.35,
    FULL: 0.1,
    UNKNOWN: 0.5,
  };

  const rawScore = crowdingMap[route.crowdingLevel] ?? 0.5;
  let score = rawScore;

  if (profile.crowdingPref === 'AVOID') {
    // amplify penalty for crowded routes
    if (route.crowdingLevel === 'HIGH' || route.crowdingLevel === 'FULL') {
      score *= 0.4;
      warnings.push(`Vehicle is ${route.crowdingLevel.toLowerCase()} — you prefer uncrowded buses`);
    } else if (route.crowdingLevel === 'UNKNOWN') {
      warnings.push('Crowding data unavailable');
    } else {
      notes.push(`Predicted ${route.crowdingLevel.toLowerCase()} crowding`);
    }
  } else if (profile.crowdingPref === 'LOW_PREFERENCE') {
    if (route.crowdingLevel === 'HIGH' || route.crowdingLevel === 'FULL') {
      score *= 0.6;
      warnings.push(`${route.crowdingLevel.toLowerCase()} crowding`);
    } else {
      notes.push(`${route.crowdingLevel.toLowerCase()} crowding`);
    }
  } else {
    if (route.crowdingLevel !== 'UNKNOWN') {
      notes.push(`${route.crowdingLevel.toLowerCase()} crowding`);
    }
  }

  return { score: Math.max(0, Math.min(1, score)), notes, warnings };
}

function scoreReliability(_profile: AccessibilityProfile, route: RouteCharacteristics): {
  score: number;
  notes: string[];
  warnings: string[];
} {
  const notes: string[] = [];
  const warnings: string[] = [];
  let score = route.reliability;

  if (route.delayMinutes > 10) {
    score *= 0.5;
    warnings.push(`Currently delayed by ${route.delayMinutes} minutes`);
  } else if (route.delayMinutes > 5) {
    score *= 0.75;
    warnings.push(`Minor delay of ${route.delayMinutes} minutes`);
  } else if (route.delayMinutes === 0) {
    notes.push('Running on schedule');
  }

  return { score: Math.max(0, Math.min(1, score)), notes, warnings };
}

function scoreTime(_profile: AccessibilityProfile, route: RouteCharacteristics): {
  score: number;
  notes: string[];
} {
  // Normalise: 10 minutes → 1.0, 60+ minutes → 0.1
  const score = Math.max(0.1, 1.0 - (route.travelTimeMinutes - 10) / 60);
  const notes = [`${route.travelTimeMinutes} min journey`];
  return { score: Math.min(1.0, score), notes };
}

function scoreCost(_profile: AccessibilityProfile, route: RouteCharacteristics): {
  score: number;
  notes: string[];
} {
  if (route.fareEstimateINR === null) {
    return { score: 0.5, notes: ['Fare unknown'] };
  }
  // ₹0–₹20 → 1.0, ₹100+ → 0.2
  const score = Math.max(0.2, 1.0 - route.fareEstimateINR / 125);
  return { score: Math.min(1.0, score), notes: [`Estimated ₹${route.fareEstimateINR}`] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scoring function
// ─────────────────────────────────────────────────────────────────────────────

export function scoreRoute(
  profile: AccessibilityProfile,
  route: RouteCharacteristics,
): AccessibilityScoreResult {
  const accessibility = scoreAccessibility(profile, route);
  const safety = scoreSafety(profile, route);
  const crowding = scoreCrowding(profile, route);
  const reliability = scoreReliability(profile, route);
  const time = scoreTime(profile, route);
  const cost = scoreCost(profile, route);

  // Weighted sum
  const overall =
    accessibility.score * profile.weightAccessibility +
    safety.score * profile.weightSafety +
    crowding.score * profile.weightCrowding +
    reliability.score * profile.weightReliability +
    time.score * profile.weightTime +
    cost.score * profile.weightCost;

  const allWarnings = [
    ...accessibility.warnings,
    ...safety.warnings,
    ...crowding.warnings,
    ...reliability.warnings,
  ];

  const allNotes = [
    ...accessibility.notes,
    ...safety.notes,
    ...crowding.notes,
    ...reliability.notes,
    ...time.notes,
    ...cost.notes,
  ];

  const recommendation: AccessibilityScoreResult['recommendation'] =
    overall >= 0.65
      ? 'RECOMMENDED'
      : overall >= 0.4
        ? 'ACCEPTABLE'
        : 'NOT_RECOMMENDED';

  return {
    accessibilityScore: Math.round(accessibility.score * 100) / 100,
    safetyScore: Math.round(safety.score * 100) / 100,
    crowdingScore: Math.round(crowding.score * 100) / 100,
    reliabilityScore: Math.round(reliability.score * 100) / 100,
    timeScore: Math.round(time.score * 100) / 100,
    costScore: Math.round(cost.score * 100) / 100,
    overallScore: Math.round(overall * 100) / 100,
    explanation: allNotes,
    warnings: allWarnings,
    recommendation,
  };
}

/**
 * Build a default accessibility profile for users who haven't set one.
 */
export function defaultProfile(): AccessibilityProfile {
  return {
    requiresWheelchair: false,
    requiresLowFloor: false,
    requiresAudioAids: false,
    requiresVisualAids: false,
    stairs: 'ACCEPTABLE',
    walkingToleranceM: 800,
    crowdingPref: 'ACCEPTABLE',
    safetyPref: 'NONE',
    nightTravelOk: true,
    weightAccessibility: 0.3,
    weightSafety: 0.2,
    weightCrowding: 0.2,
    weightReliability: 0.15,
    weightTime: 0.1,
    weightCost: 0.05,
  };
}

/**
 * Preset profiles for common personas.
 */
export const PROFILE_PRESETS: Record<string, Partial<AccessibilityProfile>> = {
  WHEELCHAIR: {
    requiresWheelchair: true,
    requiresLowFloor: true,
    stairs: 'AVOID',
    walkingToleranceM: 300,
    weightAccessibility: 0.45,
    weightSafety: 0.2,
    weightCrowding: 0.15,
    weightReliability: 0.1,
    weightTime: 0.05,
    weightCost: 0.05,
  },
  ELDERLY: {
    stairs: 'AVOID',
    walkingToleranceM: 400,
    crowdingPref: 'LOW_PREFERENCE',
    weightAccessibility: 0.3,
    weightSafety: 0.25,
    weightCrowding: 0.2,
    weightReliability: 0.15,
    weightTime: 0.05,
    weightCost: 0.05,
  },
  VISUALLY_IMPAIRED: {
    requiresAudioAids: true,
    safetyPref: 'WELL_LIT_ONLY',
    weightAccessibility: 0.35,
    weightSafety: 0.3,
    weightCrowding: 0.1,
    weightReliability: 0.15,
    weightTime: 0.05,
    weightCost: 0.05,
  },
  NIGHT_TRAVELLER: {
    nightTravelOk: true,
    safetyPref: 'NIGHT_SAFE_ONLY',
    weightSafety: 0.35,
    weightAccessibility: 0.2,
    weightCrowding: 0.15,
    weightReliability: 0.2,
    weightTime: 0.05,
    weightCost: 0.05,
  },
};
