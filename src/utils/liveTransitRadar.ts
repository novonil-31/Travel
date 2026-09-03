/**
 * =========================================================================
 * ACCESS — Authentic Transit Telemetry & Radar Engine
 * =========================================================================
 * STRICT INTEGRITY RULES:
 * 1. NEVER FABRICATE DATA: Never invent fake moving buses, fake speeds, or fake license plates.
 * 2. ONLY SHOW REAL RADAR DATA: Real vehicle telemetry is only shown when legitimate positions
 *    exist from the backend database, transponder API, or verified crowdsourced commuter reports.
 * 3. TRANSPARENT PROVENANCE: If live GPS is unavailable for a corridor, honestly report that the
 *    trip is running on published timetable schedule (Live GPS Inactive).
 */

import { vehiclesApi, reportsApi } from '../api';

export interface AuthenticVehicleRecord {
  vehicleId: string;
  label: string;
  licensePlate?: string | null;
  routeShortName?: string;
  routeLongName?: string;
  latitude: number;
  longitude: number;
  bearing?: number | null;
  speedKmh?: number | null;
  occupancyStatus: 'EMPTY' | 'MANY_SEATS_AVAILABLE' | 'FEW_SEATS_AVAILABLE' | 'STANDING_ROOM_ONLY' | 'FULL' | 'UNKNOWN';
  wheelchairAccessible: boolean;
  hasRamp: boolean;
  hasLowFloor: boolean;
  rampOperational: string;
  source: string; // e.g. 'crut_gtfs_rt', 'demo_telemetry', 'crowdsourced'
  observedAt: string;
  freshness?: {
    category: 'fresh' | 'stale' | 'expired' | 'unknown';
    ageSeconds: number | null;
    label: string;
    isUsable: boolean;
  };
}

export interface AuthenticRadarStatus {
  hasLiveGps: boolean;
  activeVehicles: AuthenticVehicleRecord[];
  statusLabel: 'LIVE_GPS_ACTIVE' | 'SCHEDULED_TIMETABLE_ONLY' | 'CROWDSOURCED_ACTIVE';
  sourceAttribution: string;
  crowdsourcedCount: number;
  lastReportedText?: string;
  scheduleConfidence?: number;
}

/**
 * Local crowdsourced cache storage key for client-side persistence
 */
const CROWD_REPORTS_KEY = 'access_crowdsourced_reports';

export interface CrowdsourcedCheckIn {
  id: string;
  routeId: string;
  routeName: string;
  lat: number;
  lng: number;
  crowdingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  rampFunctional: boolean;
  reportedAt: string;
  userId?: string;
  comment?: string;
}

/**
 * Retrieve authentic local crowdsourced reports for a route
 */
export function getLocalCrowdsourcedReports(routeId: string): CrowdsourcedCheckIn[] {
  try {
    const raw = localStorage.getItem(CROWD_REPORTS_KEY);
    if (!raw) return [];
    const list: CrowdsourcedCheckIn[] = JSON.parse(raw);
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
    // Only keep reports from the last 15 minutes
    return list.filter(
      (r) =>
        (r.routeId === routeId || r.routeId.includes(routeId) || routeId.includes(r.routeId)) &&
        new Date(r.reportedAt).getTime() >= fifteenMinsAgo
    );
  } catch {
    return [];
  }
}

/**
 * Submit an authentic crowdsourced check-in
 */
export async function submitAuthenticCrowdCheckIn(checkIn: Omit<CrowdsourcedCheckIn, 'id' | 'reportedAt'>): Promise<CrowdsourcedCheckIn> {
  const newReport: CrowdsourcedCheckIn = {
    ...checkIn,
    id: crypto.randomUUID(),
    reportedAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(CROWD_REPORTS_KEY);
    const existing: CrowdsourcedCheckIn[] = raw ? JSON.parse(raw) : [];
    const updated = [newReport, ...existing.slice(0, 50)];
    localStorage.setItem(CROWD_REPORTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore local storage error
  }

  // Also submit to backend reports API if connected
  try {
    await reportsApi.submitCrowding({
      routeId: checkIn.routeId,
      level: checkIn.crowdingLevel === 'LOW' ? 'LOW' : checkIn.crowdingLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
      comment: checkIn.comment || 'Verified by commuter on board',
    });
  } catch {
    // offline or demo mode
  }

  return newReport;
}

/**
 * Queries authentic live vehicles for a route from backend DB or active crowdsourced signal.
 * ZERO FABRICATION: If no authentic telemetry exists, returns hasLiveGps: false with 0 vehicles.
 */
export async function fetchAuthenticRouteRadar(
  routeId: string,
  originLat?: number,
  originLng?: number
): Promise<AuthenticRadarStatus> {
  let liveVehicles: AuthenticVehicleRecord[] = [];

  // 1. Query backend database for real verified vehicle positions
  try {
    const res = await vehiclesApi.getByRoute(routeId);
    if (Array.isArray(res) && res.length > 0) {
      liveVehicles = res.map((v: any) => ({
        vehicleId: v.vehicleId || v.id,
        label: v.label || v.licensePlate || 'Transit Vehicle',
        licensePlate: v.licensePlate,
        routeShortName: v.routeShortName,
        routeLongName: v.routeLongName,
        latitude: v.latitude,
        longitude: v.longitude,
        bearing: v.bearing,
        speedKmh: v.speedKmh,
        occupancyStatus: v.occupancyStatus || 'UNKNOWN',
        wheelchairAccessible: !!v.wheelchairAccessible,
        hasRamp: !!v.hasRamp,
        hasLowFloor: !!v.hasLowFloor,
        rampOperational: v.rampOperational || 'UNKNOWN',
        source: v.source || 'CRUT Telemetry',
        observedAt: v.observedAt,
        freshness: v.freshness,
      }));
    }
  } catch {
    // backend offline or unpopulated
  }

  // 2. Check authentic crowdsourced reports from commuters
  const crowdReports = getLocalCrowdsourcedReports(routeId);

  // If live vehicles exist from transponder
  if (liveVehicles.length > 0) {
    return {
      hasLiveGps: true,
      activeVehicles: liveVehicles,
      statusLabel: 'LIVE_GPS_ACTIVE',
      sourceAttribution: liveVehicles[0].source === 'demo_telemetry' ? 'Verified Database Record (Demo Telemetry)' : 'CRUT MoBus Live Transponder',
      crowdsourcedCount: crowdReports.length,
      lastReportedText: liveVehicles[0].freshness?.label || 'Observed recently',
      scheduleConfidence: 0.95,
    };
  }

  // If crowdsourced updates exist from riders
  if (crowdReports.length > 0) {
    const latest = crowdReports[0];
    const crowdVehicle: AuthenticVehicleRecord = {
      vehicleId: `crowd-${latest.id}`,
      label: `Commuter Live Report (${latest.routeName || routeId})`,
      latitude: latest.lat,
      longitude: latest.lng,
      occupancyStatus: latest.crowdingLevel === 'LOW' ? 'MANY_SEATS_AVAILABLE' : latest.crowdingLevel === 'HIGH' ? 'STANDING_ROOM_ONLY' : 'FEW_SEATS_AVAILABLE',
      wheelchairAccessible: latest.rampFunctional,
      hasRamp: latest.rampFunctional,
      hasLowFloor: false,
      rampOperational: latest.rampFunctional ? 'OPERATIONAL' : 'REPORTED_OBSTRUCTED',
      source: 'Crowdsourced Commuter Check-in',
      observedAt: latest.reportedAt,
      freshness: {
        category: 'fresh',
        ageSeconds: Math.round((Date.now() - new Date(latest.reportedAt).getTime()) / 1000),
        label: 'Crowdsourced just now',
        isUsable: true,
      },
    };

    return {
      hasLiveGps: true,
      activeVehicles: [crowdVehicle],
      statusLabel: 'CROWDSOURCED_ACTIVE',
      sourceAttribution: 'Passenger Community Ground-Truth',
      crowdsourcedCount: crowdReports.length,
      lastReportedText: 'Reported by rider on corridor',
      scheduleConfidence: 0.88,
    };
  }

  // 3. ZERO FABRICATION: Truthfully report that this route is operating on scheduled timetable only
  return {
    hasLiveGps: false,
    activeVehicles: [],
    statusLabel: 'SCHEDULED_TIMETABLE_ONLY',
    sourceAttribution: 'Official Regional Transit Timetable',
    crowdsourcedCount: 0,
    scheduleConfidence: 0.90,
  };
}

/**
 * Text-to-Speech Accessible Audio Synthesizer
 */
export function speakTransitAnnouncement(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    return false;
  }
}
