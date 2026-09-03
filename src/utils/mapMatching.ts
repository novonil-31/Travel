import { haversineDistanceClient } from './onlineRouting';

export interface SnappedLocationResult {
  /** Snapped latitude & longitude on the road polyline */
  snappedPoint: [number, number];
  /** Original raw GPS coordinate */
  rawPoint: [number, number];
  /** Orthogonal cross-track distance from raw GPS to road (meters) */
  distanceToRoadMeters: number;
  /** Whether the point was successfully matched to the road network (<= 75m threshold) */
  isMatchedToRoad: boolean;
  /** Index of the segment in the polyline where the point is located */
  segmentIndex: number;
  /** Cumulative road distance from start of polyline to this point (meters) */
  distanceFromStartMeters: number;
  /** Remaining road distance from this point to the end of polyline (meters) */
  distanceToEndMeters: number;
  /** Bearing / direction of travel along this segment in degrees (0 - 360) */
  bearingDegrees: number;
  /** Percentage of route completed (0 - 100) */
  progressPercentage: number;
}

/**
 * Calculates bearing angle in degrees (0 - 360) from point A to point B
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/**
 * Calculates cumulative length of a polyline in meters
 */
export function computePolylineTotalDistance(polyline: Array<[number, number]>): number {
  if (!polyline || polyline.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineDistanceClient(
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1],
    );
  }
  return Math.round(total);
}

/**
 * Professional Map Matching / Road Snapping Algorithm
 * Projects raw GPS point onto the nearest polyline segment using orthogonal Euclidean projection
 * adjusted for spherical geodesy, and computes precise along-track road distance and remaining ETA.
 */
export function snapPointToPolyline(
  rawLat: number,
  rawLng: number,
  polyline: Array<[number, number]>,
  snapThresholdMeters = 75,
): SnappedLocationResult {
  if (!polyline || polyline.length === 0) {
    return {
      snappedPoint: [rawLat, rawLng],
      rawPoint: [rawLat, rawLng],
      distanceToRoadMeters: 0,
      isMatchedToRoad: false,
      segmentIndex: 0,
      distanceFromStartMeters: 0,
      distanceToEndMeters: 0,
      bearingDegrees: 0,
      progressPercentage: 0,
    };
  }

  if (polyline.length === 1) {
    const d = haversineDistanceClient(rawLat, rawLng, polyline[0][0], polyline[0][1]);
    return {
      snappedPoint: polyline[0],
      rawPoint: [rawLat, rawLng],
      distanceToRoadMeters: d,
      isMatchedToRoad: d <= snapThresholdMeters,
      segmentIndex: 0,
      distanceFromStartMeters: 0,
      distanceToEndMeters: 0,
      bearingDegrees: 0,
      progressPercentage: 100,
    };
  }

  let minCrossTrackDist = Infinity;
  let bestSnappedPoint: [number, number] = polyline[0];
  let bestSegmentIndex = 0;

  // Search each line segment along the route
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];

    const dx = b[1] - a[1];
    const dy = b[0] - a[0];
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 1e-12) {
      t = ((rawLng - a[1]) * dx + (rawLat - a[0]) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projLat = a[0] + t * dy;
    const projLng = a[1] + t * dx;

    const crossDist = haversineDistanceClient(rawLat, rawLng, projLat, projLng);
    if (crossDist < minCrossTrackDist) {
      minCrossTrackDist = crossDist;
      bestSnappedPoint = [projLat, projLng];
      bestSegmentIndex = i;
    }
  }

  // Calculate cumulative road distance up to the segment
  let distFromStart = 0;
  for (let i = 0; i < bestSegmentIndex; i++) {
    distFromStart += haversineDistanceClient(
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1],
    );
  }
  // Add distance from segment start to snapped point
  distFromStart += haversineDistanceClient(
    polyline[bestSegmentIndex][0],
    polyline[bestSegmentIndex][1],
    bestSnappedPoint[0],
    bestSnappedPoint[1],
  );

  // Calculate remaining distance from snapped point to destination
  let distToEnd = haversineDistanceClient(
    bestSnappedPoint[0],
    bestSnappedPoint[1],
    polyline[bestSegmentIndex + 1][0],
    polyline[bestSegmentIndex + 1][1],
  );
  for (let i = bestSegmentIndex + 1; i < polyline.length - 1; i++) {
    distToEnd += haversineDistanceClient(
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1],
    );
  }

  const totalDist = distFromStart + distToEnd;
  const progressPercentage =
    totalDist > 0 ? Math.min(100, Math.max(0, Math.round((distFromStart / totalDist) * 100))) : 0;

  const segA = polyline[bestSegmentIndex];
  const segB = polyline[bestSegmentIndex + 1];
  const bearing = calculateBearingDegrees(segA[0], segA[1], segB[0], segB[1]);

  const isMatched = minCrossTrackDist <= snapThresholdMeters;

  return {
    snappedPoint: isMatched ? bestSnappedPoint : [rawLat, rawLng],
    rawPoint: [rawLat, rawLng],
    distanceToRoadMeters: Math.round(minCrossTrackDist),
    isMatchedToRoad: isMatched,
    segmentIndex: bestSegmentIndex,
    distanceFromStartMeters: Math.round(distFromStart),
    distanceToEndMeters: Math.round(distToEnd),
    bearingDegrees: Math.round(bearing),
    progressPercentage,
  };
}

/**
 * Computes realistic travel time ETA in minutes based on real road speed profiles
 */
export function calculatePreciseRoadETA(
  distanceMeters: number,
  vehicleType: string = 'campus-vehicle',
  travelScope: string = 'local',
): number {
  if (distanceMeters <= 10) return 1;

  // Speed in meters per second
  let speedMps = 5.0; // Default Campus EV (~18 km/h)

  if (vehicleType === 'walking' || vehicleType === 'walk') {
    speedMps = 1.25; // 4.5 km/h
  } else if (vehicleType === 'campus-vehicle') {
    speedMps = 4.5; // ~16 km/h campus speed limit
  } else if (vehicleType === 'bike') {
    speedMps = 8.0; // ~28 km/h
  } else if (vehicleType === 'bus') {
    speedMps = travelScope === 'local' ? 5.5 : 15.0; // 20 km/h local vs 54 km/h highway
  } else if (vehicleType === 'train') {
    speedMps = 24.0; // ~86 km/h superfast rail
  } else if (vehicleType === 'flight') {
    speedMps = 200.0; // ~720 km/h jet cruise
  } else {
    // Car / Cab / Auto
    speedMps = travelScope === 'local' ? 7.0 : 18.0; // 25 km/h local vs 65 km/h highway
  }

  const seconds = distanceMeters / speedMps;
  return Math.max(1, Math.round(seconds / 60));
}
