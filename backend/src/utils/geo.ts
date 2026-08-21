/**
 * ACCESS — Geospatial utilities (pure JS, no PostGIS dependency)
 * Uses the Haversine formula for distance calculations.
 * Accurate to within ~0.3% for the distances we need (<50km).
 */

const EARTH_RADIUS_M = 6_371_000; // metres

/**
 * Calculate the great-circle distance between two points in metres.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate walking time in minutes for a given distance.
 * Average pedestrian speed: 1.2 m/s (~4.3 km/h).
 * Adds 20% for accessibility (ramps, crossings, etc.) when flagged.
 */
export function walkingTimeMinutes(distanceM: number, accessibilityFactor = 1.0): number {
  const WALK_SPEED_MS = 1.2; // m/s
  const seconds = distanceM / WALK_SPEED_MS;
  return Math.ceil((seconds / 60) * accessibilityFactor);
}

/**
 * Filter a list of items with lat/lon to those within radiusM metres.
 */
export function filterByRadius<T extends { latitude: number; longitude: number }>(
  items: T[],
  centerLat: number,
  centerLon: number,
  radiusM: number,
): Array<T & { distanceM: number }> {
  return items
    .map((item) => ({
      ...item,
      distanceM: haversineDistance(centerLat, centerLon, item.latitude, item.longitude),
    }))
    .filter((item) => item.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * Convert seconds from midnight to HH:MM string.
 * GTFS times can exceed 24h (next-day trips).
 */
export function secondsToTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Convert HH:MM:SS string (possibly >24h) to seconds from midnight.
 */
export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

/**
 * Get current seconds from midnight (local).
 */
export function currentSecondsFromMidnight(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

/**
 * Get day-of-week index (0=Monday, 6=Sunday) — GTFS convention.
 */
export function dayOfWeek(date = new Date()): number {
  return (date.getDay() + 6) % 7; // JS: 0=Sun → convert to Mon=0
}

export function isWeekend(date = new Date()): boolean {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}
