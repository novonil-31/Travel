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
 * Search places online using OpenStreetMap Nominatim (India Prioritized), Photon & Gemini AI.
 */
export async function searchPlacesOnline(query: string, userLat?: number, userLng?: number): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 1) return [];

  const results: GeocodedPlace[] = [];
  const encodedQ = encodeURIComponent(query.trim());
  const latBias = userLat !== undefined ? userLat : 20.5937;
  const lonBias = userLng !== undefined ? userLng : 78.9629;

  try {
    // 1. Query OpenStreetMap Nominatim with India countrycode filter
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQ}&countrycodes=in&limit=8&addressdetails=1`;
    const photonUrl = `https://photon.komoot.io/api/?q=${encodedQ}&lat=${latBias}&lon=${lonBias}&limit=8`;

    const [nomRes, photonRes] = await Promise.allSettled([
      fetch(nomUrl, {
        headers: {
          'User-Agent': 'ACCESS-Public-Transport-Assistant/2.0 (contact@access-transit.in)',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(3500),
      }),
      fetch(photonUrl, { signal: AbortSignal.timeout(3500) }),
    ]);

    if (nomRes.status === 'fulfilled' && nomRes.value.ok) {
      const data = (await nomRes.value.json()) as Array<{
        display_name: string;
        name?: string;
        lat: string;
        lon: string;
        type: string;
        importance?: number;
      }>;

      data.forEach((item) => {
        const primary = item.name || item.display_name.split(',')[0] || query;
        const parts = item.display_name.split(',').slice(1, 4).map((p) => p.trim()).filter(Boolean);
        const sub = parts.join(', ');
        results.push({
          displayName: sub ? `📍 ${primary}, ${sub}` : `📍 ${primary}`,
          name: primary,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type || 'place',
          importance: item.importance,
        });
      });
    }

    if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
      const pData = (await photonRes.value.json()) as {
        features: Array<{
          geometry: { coordinates: [number, number] };
          properties: { name?: string; street?: string; city?: string; state?: string; country?: string; osm_value?: string };
        }>;
      };

      pData.features?.forEach((f) => {
        const name = f.properties.name || f.properties.street || query;
        const locParts = [f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', ');
        results.push({
          displayName: locParts ? `📍 ${name}, ${locParts}` : `📍 ${name}`,
          name,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          type: f.properties.osm_value || 'place',
        });
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch geocoding from Nominatim/Photon');
  }

  // 2. If nothing found for query, try Gemini AI Indian Geocoder Fallback
  if (results.length === 0 && process.env.GEMINI_API_KEY) {
    try {
      const key = process.env.GEMINI_API_KEY;
      const prompt = `You are a real-time India GIS location and monument geocoding engine.
Resolve the location in India for: "${query}".
Return JSON:
{
  "name": "Proper Place / City / Monument Name",
  "displayName": "📍 Name, District, State, India",
  "state": "State Name",
  "district": "District Name",
  "lat": 28.6139,
  "lng": 77.2090,
  "type": "city" or "town" or "monument" or "village"
}`;

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(4000),
        },
      );

      if (aiRes.ok) {
        const json = (await aiRes.json()) as any;
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const p = Array.isArray(parsed) ? parsed[0] : parsed;
          if (p && p.lat && p.lng) {
            results.push({
              displayName: p.displayName || `📍 ${p.name || query}, ${p.state || 'India'}`,
              name: p.name || query,
              lat: Number(p.lat),
              lng: Number(p.lng),
              type: p.type || 'place',
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique: GeocodedPlace[] = [];
  for (const r of results) {
    const key = `${r.lat.toFixed(3)}_${r.lng.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  return unique;
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
