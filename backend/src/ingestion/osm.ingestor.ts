/**
 * ACCESS — OSM / Overpass Provider
 *
 * Uses the Overpass API to enrich stop data with accessibility tags.
 * Respects rate limits and caches results to avoid hammering the public service.
 *
 * RULE: OSM is NOT the authoritative source for bus schedules.
 *       We use it for geographic enrichment only.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

/**
 * Fetch bus stops for a bounding box from Overpass.
 * Returns raw OSM nodes.
 */
export async function fetchOSMBusStops(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<OverpassNode[]> {
  if (!config.osm.enabled) {
    logger.debug('OSM disabled, skipping');
    return [];
  }

  const bbox = `${south},${west},${north},${east}`;
  const cacheFile = path.join(
    config.osm.cacheDir,
    `stops_${bbox.replace(/[^0-9.,-]/g, '')}.json`,
  );

  // Check cache
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
    if (ageHours < config.osm.cacheTtlHours) {
      logger.debug({ cacheFile }, 'Returning cached OSM data');
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as OverpassResponse;
      return cached.elements;
    }
  }

  const query = `
[out:json][timeout:25];
(
  node["highway"="bus_stop"](${bbox});
  node["public_transport"="platform"]["bus"="yes"](${bbox});
  node["public_transport"="stop_position"]["bus"="yes"](${bbox});
);
out body;
`;

  try {
    logger.info({ bbox }, 'Fetching OSM bus stops from Overpass');

    const { default: fetch } = await import('node-fetch');
    const response = await fetch(config.osm.overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Overpass API error');
      return [];
    }

    const data = (await response.json()) as OverpassResponse;

    // Cache the result
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(data));

    logger.info({ count: data.elements.length }, 'OSM stops fetched');
    return data.elements;
  } catch (e) {
    logger.warn({ err: e }, 'Failed to fetch OSM data — provider unavailable');
    return [];
  }
}

/**
 * Fetch auto/taxi stands from OSM for a bounding box.
 */
export async function fetchOSMTransportStands(
  south: number,
  west: number,
  north: number,
  east: number,
): Promise<OverpassNode[]> {
  if (!config.osm.enabled) return [];

  const bbox = `${south},${west},${north},${east}`;
  const query = `
[out:json][timeout:25];
(
  node["amenity"="taxi"](${bbox});
  node["amenity"="bus_station"](${bbox});
  node["highway"="bus_stop"](${bbox});
  node["public_transport"="station"](${bbox});
);
out body;
`;

  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(config.osm.overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as OverpassResponse;
    return data.elements;
  } catch {
    return [];
  }
}

/**
 * Enrich existing stops in the database with OSM accessibility tags.
 * Only updates stops that have a matching OSM node within 50m.
 */
export async function enrichStopsFromOSM(cityId?: string): Promise<number> {
  const stops = await prisma.stop.findMany({
    where: cityId ? { cityId } : {},
    select: { id: true, latitude: true, longitude: true },
  });

  if (stops.length === 0) return 0;

  // Calculate bounding box from all stops + 0.01 degree buffer
  const lats = stops.map((s) => s.latitude);
  const lons = stops.map((s) => s.longitude);
  const south = Math.min(...lats) - 0.01;
  const north = Math.max(...lats) + 0.01;
  const west = Math.min(...lons) - 0.01;
  const east = Math.max(...lons) + 0.01;

  const osmStops = await fetchOSMBusStops(south, west, north, east);
  if (osmStops.length === 0) return 0;

  let enriched = 0;

  for (const stop of stops) {
    // Find nearest OSM node within 50m
    const nearest = osmStops.find((o) => {
      const dLat = (o.lat - stop.latitude) * 111320;
      const dLon = (o.lon - stop.longitude) * 111320 * Math.cos(stop.latitude * Math.PI / 180);
      return Math.sqrt(dLat ** 2 + dLon ** 2) < 50;
    });

    if (!nearest) continue;

    const tags = nearest.tags;

    await prisma.stop.update({
      where: { id: stop.id },
      data: {
        osmNodeId: String(nearest.id),
        hasRamp: tags['ramp'] === 'yes' || tags['tactile_paving'] === 'yes',
        hasShelter: tags['shelter'] === 'yes',
        hasLighting: tags['lit'] === 'yes',
        hasTactilePaving: tags['tactile_paving'] === 'yes',
        // Wheelchair boarding from OSM
        wheelchairBoarding:
          tags['wheelchair'] === 'yes' ? 1 :
          tags['wheelchair'] === 'no' ? 2 : 0,
      },
    });

    enriched++;
  }

  logger.info({ enriched, total: stops.length }, 'OSM stop enrichment complete');
  return enriched;
}
