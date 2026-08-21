/**
 * ACCESS — Online Real-world Routing & Geocoding Service
 *
 * Connects to live public OpenStreetMap / Nominatim & OSRM APIs:
 * - Live place search and geocoding
 * - Real road network path calculation (OSRM)
 * - Dynamic transit geometry and intermediate coordinate generation
 */

import { logger } from '../logger.js';

export interface GeocodedPlace {
  displayName: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  importance?: number;
}

export interface RouteGeometryResult {
  coordinates: Array<[number, number]>; // [lat, lng]
  distanceM: number;
  durationMin: number;
  instructions?: string[];
}

/**
 * Search places online using OpenStreetMap Nominatim.
 */
export async function searchPlacesOnline(query: string): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const { default: fetch } = await import('node-fetch');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=7&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ACCESS-Public-Transport-Assistant/1.0',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Nominatim geocoding error');
      return [];
    }

    const data = (await response.json()) as Array<{
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      type: string;
      importance?: number;
    }>;

    return data.map((item) => ({
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0] || query,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch geocoding from Nominatim');
    return [];
  }
}

/**
 * Reverse geocode coordinates to get a human-readable address.
 */
export async function reverseGeocodeOnline(lat: number, lng: number): Promise<string | null> {
  try {
    const { default: fetch } = await import('node-fetch');
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ACCESS-Public-Transport-Assistant/1.0',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

/**
 * Calculate actual real-world road geometry using OSRM (Open Source Routing Machine).
 * Mode can be 'driving' (transit/car) or 'walking' (pedestrian).
 */
export async function fetchRoadGeometry(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'driving' | 'walking' = 'driving',
): Promise<RouteGeometryResult | null> {
  try {
    const { default: fetch } = await import('node-fetch');
    const url = `https://router.project-osrm.org/route/v1/${mode}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      code: string;
      routes?: Array<{
        distance: number; // meters
        duration: number; // seconds
        geometry: {
          coordinates: Array<[number, number]>; // [lon, lat]
        };
        legs?: Array<{
          steps?: Array<{
            maneuver?: { instruction?: string };
            name?: string;
          }>;
        }>;
      }>;
    };

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0]!;
    // Convert GeoJSON [lon, lat] to Leaflet/standard [lat, lng]
    const coordinates: Array<[number, number]> = route.geometry.coordinates.map(
      ([lon, lat]) => [lat, lon],
    );

    const instructions: string[] = [];
    if (route.legs?.[0]?.steps) {
      for (const step of route.legs[0].steps) {
        if (step.maneuver?.instruction) {
          instructions.push(step.maneuver.instruction);
        } else if (step.name) {
          instructions.push(`Head along ${step.name}`);
        }
      }
    }

    return {
      coordinates,
      distanceM: Math.round(route.distance),
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      instructions,
    };
  } catch (err) {
    logger.debug({ err }, 'OSRM online routing fallback triggered');
    return null;
  }
}

/**
 * Generate interpolated realistic points between two coordinates if OSRM is unreachable.
 */
export function interpolatePoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  steps = 8,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Add subtle curvature
    const curve = Math.sin(t * Math.PI) * 0.0015;
    points.push([
      startLat + (endLat - startLat) * t + curve,
      startLng + (endLng - startLng) * t + curve,
    ]);
  }
  return points;
}
