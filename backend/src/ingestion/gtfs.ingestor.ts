/**
 * ACCESS — GTFS Static Feed Importer
 *
 * Generic importer that works with any GTFS ZIP feed.
 * Downloads, validates, parses, and upserts to the database.
 *
 * RULE: If the feed download fails, the existing valid data is preserved.
 * RULE: Every imported record is tagged with the DataSource ID.
 */

import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { parse } from 'csv-parse';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types matching GTFS spec
// ─────────────────────────────────────────────────────────────────────────────

interface GTFSAgency {
  agency_id?: string;
  agency_name: string;
  agency_url?: string;
  agency_timezone?: string;
  agency_phone?: string;
  agency_email?: string;
  agency_fare_url?: string;
}

interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  stop_code?: string;
  stop_desc?: string;
  wheelchair_boarding?: string;
}

interface GTFSRoute {
  route_id: string;
  agency_id?: string;
  route_short_name?: string;
  route_long_name?: string;
  route_desc?: string;
  route_type?: string;
  route_color?: string;
  route_text_color?: string;
}

interface GTFSTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: string;
  shape_id?: string;
  wheelchair_accessible?: string;
}

interface GTFSStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
  pickup_type?: string;
  drop_off_type?: string;
  shape_dist_traveled?: string;
}

interface GTFSCalendar {
  service_id: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  start_date: string;
  end_date: string;
}

interface GTFSFareAttribute {
  fare_id: string;
  price: string;
  currency_type: string;
  payment_method: string;
  transfers?: string;
}

interface GTFSFareRule {
  fare_id: string;
  route_id?: string;
  origin_id?: string;
  destination_id?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV parser helper
// ─────────────────────────────────────────────────────────────────────────────

async function parseGTFSFile<T>(filePath: string): Promise<T[]> {
  if (!fs.existsSync(filePath)) {
    logger.debug({ filePath }, 'GTFS file not found, skipping');
    return [];
  }

  const records: T[] = [];
  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true }),
  );

  for await (const record of parser) {
    records.push(record as T);
  }

  return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map GTFS route_type to our VehicleType
// ─────────────────────────────────────────────────────────────────────────────

function mapRouteType(gtfsType: string | undefined): string {
  switch (gtfsType) {
    case '0': return 'BUS'; // Tram
    case '1': return 'BUS'; // Subway
    case '2': return 'BUS'; // Rail
    case '3': return 'BUS'; // Bus
    case '4': return 'BUS'; // Ferry
    case '11': return 'BUS'; // Trolleybus
    case '12': return 'BUS'; // Monorail
    default: return 'BUS';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main import function
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportResult {
  agencies: number;
  stops: number;
  routes: number;
  trips: number;
  stopTimes: number;
  fares: number;
  errors: string[];
}

/**
 * Import a GTFS feed from a directory of extracted files.
 * Returns counts of upserted records.
 */
export async function importGTFSFromDirectory(
  dir: string,
  sourceId: string,
  cityId?: string,
): Promise<ImportResult> {
  const result: ImportResult = {
    agencies: 0, stops: 0, routes: 0, trips: 0, stopTimes: 0, fares: 0, errors: [],
  };

  logger.info({ dir, sourceId }, 'Starting GTFS import');

  // ── Agencies ──────────────────────────────────────────────────────────────
  const agencies = await parseGTFSFile<GTFSAgency>(path.join(dir, 'agency.txt'));
  const agencyIdMap = new Map<string, string>(); // gtfsId → dbId

  for (const a of agencies) {
    try {
      const existing = await prisma.agency.findFirst({
        where: { gtfsAgencyId: a.agency_id ?? a.agency_name, sourceId },
      });

      const data = {
        name: a.agency_name,
        url: a.agency_url,
        timezone: a.agency_timezone ?? 'Asia/Kolkata',
        phone: a.agency_phone,
        email: a.agency_email,
        fareUrl: a.agency_fare_url,
        gtfsAgencyId: a.agency_id ?? a.agency_name,
        sourceId,
        cityId,
      };

      let agency: { id: string };
      if (existing) {
        agency = await prisma.agency.update({ where: { id: existing.id }, data });
      } else {
        agency = await prisma.agency.create({ data });
      }

      agencyIdMap.set(a.agency_id ?? a.agency_name, agency.id);
      result.agencies++;
    } catch (e) {
      result.errors.push(`Agency ${a.agency_name}: ${String(e)}`);
    }
  }

  // ── Stops ─────────────────────────────────────────────────────────────────
  const stops = await parseGTFSFile<GTFSStop>(path.join(dir, 'stops.txt'));
  const stopIdMap = new Map<string, string>(); // gtfsId → dbId

  for (const s of stops) {
    if (!s.stop_id || !s.stop_lat || !s.stop_lon) continue;
    const lat = parseFloat(s.stop_lat);
    const lon = parseFloat(s.stop_lon);
    if (isNaN(lat) || isNaN(lon)) continue;

    try {
      const existing = await prisma.stop.findFirst({
        where: { gtfsStopId: s.stop_id, sourceId },
      });

      const wheelchairBoarding = parseInt(s.wheelchair_boarding ?? '0', 10) || 0;

      const data = {
        name: s.stop_name,
        latitude: lat,
        longitude: lon,
        code: s.stop_code,
        description: s.stop_desc,
        wheelchairBoarding,
        gtfsStopId: s.stop_id,
        sourceId,
        cityId,
        dataStatus: 'CONFIRMED' as const,
        confidence: 0.9,
        retrievedAt: new Date(),
      };

      let stop: { id: string };
      if (existing) {
        stop = await prisma.stop.update({ where: { id: existing.id }, data });
      } else {
        stop = await prisma.stop.create({ data });
      }

      stopIdMap.set(s.stop_id, stop.id);
      result.stops++;
    } catch (e) {
      result.errors.push(`Stop ${s.stop_id}: ${String(e)}`);
    }
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  const routes = await parseGTFSFile<GTFSRoute>(path.join(dir, 'routes.txt'));
  const routeIdMap = new Map<string, string>(); // gtfsId → dbId

  for (const r of routes) {
    if (!r.route_id) continue;

    try {
      const agencyDbId = r.agency_id ? agencyIdMap.get(r.agency_id) : undefined;

      const existing = await prisma.route.findFirst({
        where: { gtfsRouteId: r.route_id, sourceId },
      });

      const data = {
        shortName: r.route_short_name ?? r.route_id,
        longName: r.route_long_name ?? r.route_short_name ?? r.route_id,
        description: r.route_desc,
        vehicleType: mapRouteType(r.route_type) as 'BUS' | 'MINIBUS' | 'AUTO_RICKSHAW' | 'SHARED_TAXI' | 'CAMPUS_SHUTTLE' | 'UNKNOWN',
        color: r.route_color ? `#${r.route_color}` : '#059669',
        textColor: r.route_text_color ? `#${r.route_text_color}` : undefined,
        gtfsRouteId: r.route_id,
        sourceId,
        agencyId: agencyDbId,
        dataStatus: 'CONFIRMED' as const,
        confidence: 0.9,
        retrievedAt: new Date(),
      };

      let route: { id: string };
      if (existing) {
        route = await prisma.route.update({ where: { id: existing.id }, data });
      } else {
        route = await prisma.route.create({ data });
      }

      routeIdMap.set(r.route_id, route.id);
      result.routes++;
    } catch (e) {
      result.errors.push(`Route ${r.route_id}: ${String(e)}`);
    }
  }

  // ── Calendar ──────────────────────────────────────────────────────────────
  const calendars = await parseGTFSFile<GTFSCalendar>(path.join(dir, 'calendar.txt'));
  const calendarMap = new Map<string, GTFSCalendar>();
  for (const c of calendars) {
    calendarMap.set(c.service_id, c);
  }

  // ── Trips ─────────────────────────────────────────────────────────────────
  const trips = await parseGTFSFile<GTFSTrip>(path.join(dir, 'trips.txt'));
  const tripIdMap = new Map<string, string>(); // gtfsId → dbId

  // Process in batches to avoid overwhelming SQLite
  const TRIP_BATCH = 100;
  for (let i = 0; i < trips.length; i += TRIP_BATCH) {
    const batch = trips.slice(i, i + TRIP_BATCH);
    for (const t of batch) {
      if (!t.trip_id || !t.route_id) continue;

      const routeDbId = routeIdMap.get(t.route_id);
      if (!routeDbId) continue;

      try {
        const cal = calendarMap.get(t.service_id);

        const existing = await prisma.trip.findFirst({
          where: { gtfsTripId: t.trip_id, sourceId },
        });

        const data = {
          routeId: routeDbId,
          gtfsTripId: t.trip_id,
          sourceId,
          headsign: t.trip_headsign,
          shortName: t.trip_short_name,
          directionId: t.direction_id ? parseInt(t.direction_id, 10) : undefined,
          shapeId: t.shape_id,
          serviceId: t.service_id,
          wheelchairAccessible: parseInt(t.wheelchair_accessible ?? '0', 10) || 0,
          monday: cal?.monday === '1',
          tuesday: cal?.tuesday === '1',
          wednesday: cal?.wednesday === '1',
          thursday: cal?.thursday === '1',
          friday: cal?.friday === '1',
          saturday: cal?.saturday === '1',
          sunday: cal?.sunday === '1',
          startDate: cal?.start_date,
          endDate: cal?.end_date,
        };

        let trip: { id: string };
        if (existing) {
          trip = await prisma.trip.update({ where: { id: existing.id }, data });
        } else {
          trip = await prisma.trip.create({ data });
        }

        tripIdMap.set(t.trip_id, trip.id);
        result.trips++;
      } catch (e) {
        result.errors.push(`Trip ${t.trip_id}: ${String(e)}`);
      }
    }
  }

  // ── Stop Times ────────────────────────────────────────────────────────────
  const stopTimes = await parseGTFSFile<GTFSStopTime>(path.join(dir, 'stop_times.txt'));

  const ST_BATCH = 500;
  for (let i = 0; i < stopTimes.length; i += ST_BATCH) {
    const batch = stopTimes.slice(i, i + ST_BATCH);
    for (const st of batch) {
      const tripDbId = tripIdMap.get(st.trip_id);
      const stopDbId = stopIdMap.get(st.stop_id);
      if (!tripDbId || !stopDbId) continue;

      try {
        const seq = parseInt(st.stop_sequence, 10);

        await prisma.stopTime.upsert({
          where: { tripId_stopSequence: { tripId: tripDbId, stopSequence: seq } },
          update: {
            arrivalTime: st.arrival_time,
            departureTime: st.departure_time,
            stopId: stopDbId,
            pickupType: parseInt(st.pickup_type ?? '0', 10),
            dropOffType: parseInt(st.drop_off_type ?? '0', 10),
            distTraveled: st.shape_dist_traveled ? parseFloat(st.shape_dist_traveled) : null,
          },
          create: {
            tripId: tripDbId,
            stopId: stopDbId,
            arrivalTime: st.arrival_time,
            departureTime: st.departure_time,
            stopSequence: seq,
            pickupType: parseInt(st.pickup_type ?? '0', 10),
            dropOffType: parseInt(st.drop_off_type ?? '0', 10),
            distTraveled: st.shape_dist_traveled ? parseFloat(st.shape_dist_traveled) : null,
          },
        });

        result.stopTimes++;
      } catch (e) {
        result.errors.push(`StopTime ${st.trip_id}:${st.stop_sequence}: ${String(e)}`);
      }
    }
  }

  // Also build RouteStop links from stop times
  await buildRouteStops(routeIdMap, stopIdMap, trips, stopTimes);

  // ── Fares ─────────────────────────────────────────────────────────────────
  const fareAttrs = await parseGTFSFile<GTFSFareAttribute>(path.join(dir, 'fare_attributes.txt'));
  const fareRules = await parseGTFSFile<GTFSFareRule>(path.join(dir, 'fare_rules.txt'));

  const fareAttrMap = new Map<string, GTFSFareAttribute>();
  for (const fa of fareAttrs) {
    fareAttrMap.set(fa.fare_id, fa);
  }

  for (const fr of fareRules) {
    const attr = fareAttrMap.get(fr.fare_id);
    if (!attr) continue;

    const routeDbId = fr.route_id ? routeIdMap.get(fr.route_id) : undefined;
    const price = parseFloat(attr.price);
    if (isNaN(price)) continue;

    try {
      await prisma.fare.create({
        data: {
          routeId: routeDbId,
          gtfsFareId: fr.fare_id,
          sourceId,
          originZoneId: fr.origin_id,
          destinationZoneId: fr.destination_id,
          currency: attr.currency_type || 'INR',
          priceExact: price,
          isExact: true,
          paymentMethod: parseInt(attr.payment_method ?? '0', 10),
          confidence: 0.9,
          dataStatus: 'CONFIRMED',
          source: 'gtfs',
          retrievedAt: new Date(),
        },
      });
      result.fares++;
    } catch (e) {
      result.errors.push(`Fare ${fr.fare_id}: ${String(e)}`);
    }
  }

  logger.info(result, 'GTFS import complete');
  return result;
}

/**
 * Build RouteStop junction records from trip stop sequences.
 */
async function buildRouteStops(
  routeIdMap: Map<string, string>,
  stopIdMap: Map<string, string>,
  trips: GTFSTrip[],
  stopTimes: GTFSStopTime[],
): Promise<void> {
  // Build a map: routeGtfsId → Set<{ gtfsStopId, minSequence }>
  const routeStops = new Map<string, Map<string, number>>();

  const tripRouteMap = new Map<string, string>();
  for (const t of trips) {
    tripRouteMap.set(t.trip_id, t.route_id);
  }

  for (const st of stopTimes) {
    const routeGtfsId = tripRouteMap.get(st.trip_id);
    if (!routeGtfsId) continue;

    if (!routeStops.has(routeGtfsId)) {
      routeStops.set(routeGtfsId, new Map());
    }

    const existing = routeStops.get(routeGtfsId)!.get(st.stop_id);
    const seq = parseInt(st.stop_sequence, 10);
    if (existing === undefined || seq < existing) {
      routeStops.get(routeGtfsId)!.set(st.stop_id, seq);
    }
  }

  for (const [routeGtfsId, stops] of routeStops) {
    const routeDbId = routeIdMap.get(routeGtfsId);
    if (!routeDbId) continue;

    for (const [stopGtfsId, seq] of stops) {
      const stopDbId = stopIdMap.get(stopGtfsId);
      if (!stopDbId) continue;

      try {
        await prisma.routeStop.upsert({
          where: { routeId_stopId_sequence: { routeId: routeDbId, stopId: stopDbId, sequence: seq } },
          update: { sequence: seq },
          create: { routeId: routeDbId, stopId: stopDbId, sequence: seq },
        });
      } catch (_) {
        // Silently skip duplicate route stops
      }
    }
  }
}
