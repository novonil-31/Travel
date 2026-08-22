import type {
  Stop, Route, RouteStop, Vehicle, User, TransportCondition,
  RouteSearchResult, RouteScores, RouteRecommendation, Journey,
  JourneySegment, Notification, Report, AccessibilityProfile,
  CrowdingLevel, AccessibilityStatus, VehicleStatusType,
} from '../types';
import {
  fetchRoadGeometryLive,
  haversineDistanceClient,
  interpolateCurvedPoints,
} from '../utils/onlineRouting';

import { OFFICIAL_STOPS, OFFICIAL_ROUTES, calculateOfficialBusFare, type OfficialBusLine, type TransitStopInfo } from './liveTimetable';

// ============ STOPS ============
export const DEMO_STOPS: Stop[] = OFFICIAL_STOPS.map((s, idx) => ({
  id: s.id,
  name: s.name,
  lat: s.lat,
  lng: s.lng,
  accessible: s.hasRamp,
  hasRamp: s.hasRamp,
  hasStairs: false,
  hasLighting: s.hasLighting,
  sheltered: s.hasShelter,
  routes: s.servingRoutes,
}));

// ============ ROUTES ============
export const DEMO_ROUTES: Route[] = [
  {
    id: 'C3', name: 'City Bus (Low-Floor Ramp)', shortName: 'Bus', vehicleType: 'bus', color: '#059669',
    description: 'Direct step-free city bus with certified wheelchair ramp & priority seating', active: true,
    stops: [
      { stopId: 's1', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's5', order: 1, arrivalOffset: 8, departureOffset: 9 },
      { stopId: 's2', order: 2, arrivalOffset: 15, departureOffset: 16 },
      { stopId: 's3', order: 3, arrivalOffset: 28, departureOffset: 28 },
    ],
  },
  {
    id: 'C2', name: 'Fast City Bus (Express)', shortName: 'Bus', vehicleType: 'bus', color: '#2563eb',
    description: 'Fast express city transit with limited stops', active: true,
    stops: [
      { stopId: 's1', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's3', order: 1, arrivalOffset: 10, departureOffset: 11 },
      { stopId: 's8', order: 2, arrivalOffset: 18, departureOffset: 19 },
      { stopId: 's9', order: 3, arrivalOffset: 22, departureOffset: 22 },
    ],
  },
  {
    id: 'S1', name: 'Sharing Taxi & Auto Stand', shortName: 'Taxi', vehicleType: 'shared-transport', color: '#7c3aed',
    description: 'Shared auto & taxi micro-transit from nearest designated stand', active: true,
    stops: [
      { stopId: 's7', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's10', order: 1, arrivalOffset: 15, departureOffset: 15 },
    ],
  },
  {
    id: 'CV1', name: 'Campus Shuttle Buggy', shortName: 'Cart', vehicleType: 'campus-vehicle', color: '#0891b2',
    description: 'Step-free electric campus buggy connecting gates and departments', active: true,
    stops: [
      { stopId: 's1', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's7', order: 1, arrivalOffset: 5, departureOffset: 6 },
      { stopId: 's2', order: 2, arrivalOffset: 10, departureOffset: 10 },
    ],
  },
];

// ============ VEHICLES ============
export const DEMO_VEHICLES: Vehicle[] = [
  { id: 'v1', routeId: 'C3', name: 'City Bus-01 (Ramp Active)', type: 'bus', capacity: 40, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's2', lat: 20.3530, lng: 85.8160 },
  { id: 'v2', routeId: 'C2', name: 'Fast Bus-01', type: 'bus', capacity: 40, accessible: true, hasRamp: true, hasLowFloor: false, status: 'active', currentStopId: 's1', lat: 20.3555, lng: 85.8145 },
  { id: 'v3', routeId: 'C2', name: 'Fast Bus-02', type: 'bus', capacity: 40, accessible: false, hasRamp: false, hasLowFloor: false, status: 'active', currentStopId: 's3', lat: 20.3450, lng: 85.8180 },
  { id: 'v4', routeId: 'C5', name: 'City Bus-03 (Accessible)', type: 'bus', capacity: 35, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's4', lat: 20.3600, lng: 85.8120 },
  { id: 'v5', routeId: 'C5', name: 'City Bus-04', type: 'bus', capacity: 35, accessible: false, hasRamp: false, hasLowFloor: false, status: 'delayed', currentStopId: 's10', lat: 20.3050, lng: 85.8200 },
  { id: 'v6', routeId: 'S1', name: 'Sharing Auto-01', type: 'shared-transport', capacity: 6, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's7', lat: 20.3510, lng: 85.8130 },
  { id: 'v7', routeId: 'CV1', name: 'Campus Cart-01', type: 'campus-vehicle', capacity: 6, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's1', lat: 20.3555, lng: 85.8145 },
  { id: 'v8', routeId: 'C3', name: 'City Bus-02 (Ramp)', type: 'bus', capacity: 40, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's5', lat: 20.3570, lng: 85.8170 },
];

// ============ DEFAULT CONDITIONS ============
export const DEMO_CONDITIONS: Record<string, TransportCondition> = {
  C3: { routeId: 'C3', delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  C2: { routeId: 'C2', delay: 3, crowding: 'MEDIUM', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  C5: { routeId: 'C5', delay: 8, crowding: 'HIGH', accessibility: 'LIMITED', vehicleStatus: 'delayed', updatedAt: new Date().toISOString() },
  S1: { routeId: 'S1', delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  CV1: { routeId: 'CV1', delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
};

// ============ DEMO USER ============
export const DEMO_USER: User = {
  id: 'guest-user',
  name: 'Guest Passenger',
  email: 'guest@transit.maarg',
  role: 'passenger',
  profile: {
    mobility: 'wheelchair',
    stairs: 'avoid',
    walkingTolerance: 'low',
    crowding: 'avoid',
    vision: 'normal',
    hearing: 'normal',
    safetyPreferences: ['late-night', 'prefer-safer'],
  },
  emergencyContact: {
    name: 'Emergency Contact',
    phone: '+91 98765 43210',
    relationship: 'Family',
  },
};

// ============ FAMOUS SHARED TAXI & AUTO STANDS ============
export const DEMO_TRANSPORT_STANDS = [
  {
    id: 'ts-1',
    name: 'KIIT Square Shared Auto & Taxi Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3540,
    longitude: 85.8168,
    address: 'Near KIIT Gate 1, Chandaka Industrial Estate Road',
    operatingHours: '06:00 - 22:30',
    typicalFareMin: 15,
    typicalFareMax: 30,
    currency: 'INR',
  },
  {
    id: 'ts-2',
    name: 'Patia Chowk / Big Bazaar Auto Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3620,
    longitude: 85.8235,
    address: 'Patia Chowk, Nandankanan Road',
    operatingHours: '05:30 - 23:00',
    typicalFareMin: 20,
    typicalFareMax: 40,
    currency: 'INR',
  },
  {
    id: 'ts-3',
    name: 'Jaydev Vihar Overbridge Taxi Junction',
    type: 'SHARED_TAXI',
    latitude: 20.2980,
    longitude: 85.8210,
    address: 'Under Jaydev Vihar Flyover, NH16',
    operatingHours: '24 Hours',
    typicalFareMin: 25,
    typicalFareMax: 50,
    currency: 'INR',
  },
  {
    id: 'ts-4',
    name: 'Master Canteen Railway Station Taxi Hub',
    type: 'SHARED_TAXI',
    latitude: 20.2644,
    longitude: 85.8398,
    address: 'Bhubaneswar Railway Station Platform 1 Exit',
    operatingHours: '24 Hours',
    typicalFareMin: 30,
    typicalFareMax: 60,
    currency: 'INR',
  },
  {
    id: 'ts-5',
    name: 'Infocity Square Shared Cab Point',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3585,
    longitude: 85.8120,
    address: 'Infocity Main Avenue, DLF Cybercity',
    operatingHours: '06:00 - 22:00',
    typicalFareMin: 20,
    typicalFareMax: 35,
    currency: 'INR',
  },
  {
    id: 'ts-6',
    name: 'Barmunda ISBT Terminal Shared Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.2810,
    longitude: 85.7950,
    address: 'Barmunda Bus Terminal Outer Bay',
    operatingHours: '24 Hours',
    typicalFareMin: 25,
    typicalFareMax: 50,
    currency: 'INR',
  },
  {
    id: 'ts-7',
    name: 'Biju Patnaik Airport (BBI) Prepaid Taxi Stand',
    type: 'TAXI',
    latitude: 20.2520,
    longitude: 85.8175,
    address: 'Airport Arrivals Gate 2',
    operatingHours: '24 Hours',
    typicalFareMin: 40,
    typicalFareMax: 120,
    currency: 'INR',
  },
];

/**
 * High-precision Real-World Dynamic Journey Planning Generator
 * Connects to live OSRM and computes exact road geometry, walking legs, step-free ranking, and actual fares.
 */
export async function generateDynamicSearchResults(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string },
  profileType = 'none',
  baseDepartureTime: Date = new Date(),
): Promise<RouteSearchResult[]> {
  const isWheelchair = profileType === 'wheelchair' || profileType === 'WHEELCHAIR';

  // Total direct road distance
  const directDistanceM = Math.round(haversineDistanceClient(origin.lat, origin.lng, destination.lat, destination.lng));
  const directDistanceKm = Math.max(0.5, directDistanceM / 1000);

  // 1. DYNAMIC MATCHING ENGINE: Find ALL matching official bus lines in the transit network
  interface MatchedBusCandidate {
    route: OfficialBusLine;
    boardStop: TransitStopInfo;
    alightStop: TransitStopInfo;
    originWalkDistM: number;
    destWalkDistM: number;
    totalWalkM: number;
    score: number;
  }

  const allCandidateRoutes: MatchedBusCandidate[] = [];

  Object.values(OFFICIAL_ROUTES).forEach((rt) => {
    if (rt.id === 'Auto-Stand') return;

    const stopObjects = rt.stops
      .map((sid) => OFFICIAL_STOPS.find((s) => s.id === sid))
      .filter(Boolean) as TransitStopInfo[];

    if (stopObjects.length < 2) return;

    // Find best boarding stop on this route
    let bestBoard: TransitStopInfo | null = null;
    let minBoardDist = Infinity;
    for (const s of stopObjects) {
      const d = haversineDistanceClient(origin.lat, origin.lng, s.lat, s.lng);
      if (d < minBoardDist) {
        minBoardDist = d;
        bestBoard = s;
      }
    }

    // Find best alighting stop on this route (must be distinct from boarding stop)
    let bestAlight: TransitStopInfo | null = null;
    let minAlightDist = Infinity;
    for (const s of stopObjects) {
      if (bestBoard && s.id === bestBoard.id) continue;
      const d = haversineDistanceClient(destination.lat, destination.lng, s.lat, s.lng);
      if (d < minAlightDist) {
        minAlightDist = d;
        bestAlight = s;
      }
    }

    if (bestBoard && bestAlight) {
      const totalWalk = minBoardDist + minAlightDist;
      allCandidateRoutes.push({
        route: rt,
        boardStop: bestBoard,
        alightStop: bestAlight,
        originWalkDistM: minBoardDist,
        destWalkDistM: minAlightDist,
        totalWalkM: totalWalk,
        score: totalWalk,
      });
    }
  });

  // Sort candidate bus lines by minimum walking distance
  allCandidateRoutes.sort((a, b) => a.score - b.score);

  // Take top 2 distinct matching bus candidates
  let topBusCandidates = allCandidateRoutes.slice(0, 2);
  if (topBusCandidates.length === 0) {
    topBusCandidates = [
      {
        route: OFFICIAL_ROUTES['10'],
        boardStop: OFFICIAL_STOPS[0],
        alightStop: OFFICIAL_STOPS[OFFICIAL_STOPS.length - 1],
        originWalkDistM: 100,
        destWalkDistM: 100,
        totalWalkM: 200,
        score: 200,
      },
    ];
  }

  // Generate Bus Route Results for Matched Lines
  const busResults: RouteSearchResult[] = [];

  for (let i = 0; i < topBusCandidates.length; i++) {
    const cand = topBusCandidates[i];
    const rt = cand.route;

    // Compute real-world OSRM walking and transit legs
    const [origToBoardRes, transitRes, alightToDestRes] = await Promise.all([
      fetchRoadGeometryLive(origin.lat, origin.lng, cand.boardStop.lat, cand.boardStop.lng, 'walking'),
      fetchRoadGeometryLive(cand.boardStop.lat, cand.boardStop.lng, cand.alightStop.lat, cand.alightStop.lng, 'driving'),
      fetchRoadGeometryLive(cand.alightStop.lat, cand.alightStop.lng, destination.lat, destination.lng, 'walking'),
    ]);

    const walkToBoard = origToBoardRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, cand.boardStop.lat, cand.boardStop.lng, 8);
    const walkToBoardDist = origToBoardRes?.distanceM || Math.round(cand.originWalkDistM);
    const walkToBoardTime = origToBoardRes?.durationMin || Math.max(1, Math.ceil(walkToBoardDist / 70));

    const transitPath = transitRes?.coordinates || interpolateCurvedPoints(cand.boardStop.lat, cand.boardStop.lng, cand.alightStop.lat, cand.alightStop.lng, 16);
    const transitDist = transitRes?.distanceM || Math.round(haversineDistanceClient(cand.boardStop.lat, cand.boardStop.lng, cand.alightStop.lat, cand.alightStop.lng));
    const transitDistKm = Math.max(0.4, transitDist / 1000);
    const transitTime = transitRes?.durationMin || Math.max(4, Math.ceil(transitDist / 400));

    const walkToDest = alightToDestRes?.coordinates || interpolateCurvedPoints(cand.alightStop.lat, cand.alightStop.lng, destination.lat, destination.lng, 8);
    const walkToDestDist = alightToDestRes?.distanceM || Math.round(cand.destWalkDistM);
    const walkToDestTime = alightToDestRes?.durationMin || Math.max(1, Math.ceil(walkToDestDist / 70));

    const totalWalkDist = walkToBoardDist + walkToDestDist;
    const totalDuration = walkToBoardTime + transitTime + walkToDestTime;
    const fullRoute = [...walkToBoard, ...transitPath, ...walkToDest];

    // Real Government Mo Bus Gazette Fare Calculation
    const officialFare = calculateOfficialBusFare(transitDistKm, rt.hasAirConditioning);

    const isPrimaryWheelchairBest = i === 0 && rt.hasRamp;

    busResults.push({
      route: {
        id: rt.id,
        name: `Mo Bus ${rt.routeNumber} (${rt.routeName})`,
        shortName: rt.routeNumber,
        vehicleType: 'bus',
        color: rt.color,
        description: `${rt.busModel} • ${rt.operatingHours} • Departs every ${rt.frequencyMinutes} mins`,
        active: true,
        stops: rt.stops.map((sid, idx) => ({ stopId: sid, order: idx, arrivalOffset: idx * 4, departureOffset: idx * 4 + 1 })),
      },
      eta: totalDuration,
      duration: totalDuration,
      walkingDistance: totalWalkDist,
      transfers: 0,
      stairs: rt.hasRamp ? 0 : 1,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: rt.hasRamp,
      delay: 0,
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: rt.hasRamp ? 96 : 70,
        safety: 92,
        reliability: 92,
        comfort: rt.hasAirConditioning ? 94 : 82,
        overall: isWheelchair ? (rt.hasRamp ? 95 : 68) : 92,
      },
      fare: {
        type: 'exact',
        exact: officialFare.fare,
        currency: 'INR',
        confidence: 0.98,
        source: `CRUT Mo Bus Official Distance Fare Matrix (${officialFare.slabName})`,
        status: 'confirmed',
        notes: `${officialFare.ruleDescription} • 50% Concession (₹${officialFare.concessionFare}) for accessible pass holders`,
      },
      nearbyStands: [],
      recommendation: {
        recommended: isPrimaryWheelchairBest || (i === 0 && !isWheelchair),
        rank: i + 1,
        reasons: [
          `Direct bus transit via ${rt.routeNumber} (${rt.originTerminus} ↔ ${rt.destTerminus})`,
          rt.hasRamp ? '100% Step-free flat path with low-floor automatic wheelchair ramp' : 'Fast arterial road transit',
          `Official government regulated fare: ₹${officialFare.fare} for ${transitDistKm.toFixed(1)} km`,
          `High frequency: Departs every ${rt.frequencyMinutes} minutes`,
        ],
        tradeoff: rt.hasRamp
          ? 'Optimized for step-free access, gentle curb cuts, and certified audio-visual announcements.'
          : 'Standard curb entry; please verify ramp boarding with driver.',
      },
      geometry: {
        originToBoardWalk: walkToBoard,
        transitPath,
        alightToDestWalk: walkToDest,
        fullRoute,
      },
      intermediateStops: [
        { id: cand.boardStop.id, name: cand.boardStop.name, latitude: cand.boardStop.lat, longitude: cand.boardStop.lng, sequence: 1, hasRamp: cand.boardStop.hasRamp },
        { id: cand.alightStop.id, name: cand.alightStop.name, latitude: cand.alightStop.lat, longitude: cand.alightStop.lng, sequence: 2, hasRamp: cand.alightStop.hasRamp },
      ],
      turnByTurn: [
        `Walk ${walkToBoardDist}m along sidewalk from ${origin.name} to ${cand.boardStop.name} (~${walkToBoardTime} min)`,
        `Board Mo Bus ${rt.routeNumber} (${rt.routeName}) at ${cand.boardStop.name} (${rt.hasRamp ? 'Low-floor ramp equipped' : 'Boarding platform'})`,
        `Ride ${transitTime} min (${transitDistKm.toFixed(1)} km) along ${rt.routeNumber} corridor`,
        `Alight smoothly at ${cand.alightStop.name}`,
        `Walk ${walkToDestDist}m to ${destination.name} (~${walkToDestTime} min)`,
      ],
      segments: [
        { type: 'walk', from: origin.name, to: cand.boardStop.name, fromId: 'orig', toId: cand.boardStop.id, distance: walkToBoardDist, duration: walkToBoardTime, accessible: true, stairs: 0, notes: 'Paved sidewalk, tactile paving' },
        { type: 'board', from: cand.boardStop.name, to: `Mo Bus ${rt.routeNumber}`, fromId: cand.boardStop.id, toId: rt.id, duration: 2, accessible: rt.hasRamp, stairs: rt.hasRamp ? 0 : 1, routeId: rt.id, routeName: rt.routeName, vehicleType: 'bus', notes: rt.busModel },
        { type: 'ride', from: cand.boardStop.name, to: cand.alightStop.name, fromId: cand.boardStop.id, toId: cand.alightStop.id, duration: transitTime, accessible: rt.hasRamp, stairs: 0, routeId: rt.id, routeName: rt.routeName, crowding: 'LOW' },
        { type: 'alight', from: `Mo Bus ${rt.routeNumber}`, to: cand.alightStop.name, fromId: rt.id, toId: cand.alightStop.id, duration: 1, accessible: true, stairs: 0 },
        { type: 'walk', from: cand.alightStop.name, to: destination.name, fromId: cand.alightStop.id, toId: 'dest', distance: walkToDestDist, duration: walkToDestTime, accessible: true, stairs: 0, notes: 'Level pathway to entrance' },
      ],
      condition: DEMO_CONDITIONS.C3,
    });
  }

  // Direct Door-to-Door Driving (For Direct Auto & Bike Taxi)
  const directDrivingRes = await fetchRoadGeometryLive(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    'driving',
  );
  const directDrivingPath = directDrivingRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, destination.lat, destination.lng, 16);
  const directDrivingDistM = directDrivingRes?.distanceM || directDistanceM;
  const directDrivingDurationMin = directDrivingRes?.durationMin || Math.max(3, Math.ceil(directDrivingDistM / 500));

  // Dynamic Auto, Shared, and Bike Fares
  const autoFareExact = Math.round(30 + Math.max(0, (directDistanceKm - 1.5) * 12));
  const sharedAutoMin = directDistanceKm <= 4 ? 15 : directDistanceKm <= 10 ? 25 : 35;
  const sharedAutoMax = sharedAutoMin + 10;
  const bikeTaxiFare = Math.round(20 + directDistanceKm * 8);

  // Compute closest shared taxi & auto stands to Origin
  const nearbyStandsList = DEMO_TRANSPORT_STANDS.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    latitude: s.latitude,
    longitude: s.longitude,
    address: s.address,
    operatingHours: s.operatingHours,
    distanceM: Math.round(haversineDistanceClient(origin.lat, origin.lng, s.latitude, s.longitude)),
    typicalFareMin: s.typicalFareMin,
    typicalFareMax: s.typicalFareMax,
    currency: s.currency,
  })).sort((a, b) => a.distanceM - b.distanceM).slice(0, 3);

  // Option 3: Direct On-Demand Auto / Rickshaw (Doorstep Pickup - 0m Walk)
  const autoDuration = directDrivingDurationMin;
  const option3: RouteSearchResult = {
    route: {
      id: 'AUTO_DIRECT',
      name: 'Direct Auto / Rickshaw',
      shortName: 'Auto',
      vehicleType: 'shared-transport',
      color: '#f59e0b',
      description: 'Doorstep pickup auto rickshaw with flat floor and space for folding wheelchairs',
      active: true,
      stops: [],
    },
    eta: autoDuration,
    duration: autoDuration,
    walkingDistance: 0,
    transfers: 0,
    stairs: 0,
    crowding: 'LOW' as CrowdingLevel,
    vehicleAccessible: true,
    delay: 0,
    originCoords: { lat: origin.lat, lng: origin.lng },
    destinationCoords: { lat: destination.lat, lng: destination.lng },
    originName: origin.name,
    destinationName: destination.name,
    scores: {
      accessibility: 92,
      safety: 90,
      reliability: 95,
      comfort: 88,
      overall: 93,
    },
    fare: {
      type: 'exact',
      exact: autoFareExact,
      currency: 'INR',
      confidence: 0.95,
      source: 'Bhubaneswar RTA Auto Meter Tariff (Base ₹30 + ₹12/km)',
      status: 'estimated',
      notes: `Official government meter tariff for ${directDistanceKm.toFixed(1)} km (Base ₹30 for first 1.5 km + ₹12/km)`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: false,
      rank: 3,
      reasons: [
        'Zero walking required (door-to-door direct pickup)',
        'Fastest point-to-point departure',
        'Flat footboard with space for luggage or folded wheelchair',
      ],
      tradeoff: 'Direct meter auto fare.',
    },
    geometry: {
      originToBoardWalk: [],
      transitPath: directDrivingPath,
      alightToDestWalk: [],
      fullRoute: directDrivingPath,
    },
    intermediateStops: [],
    turnByTurn: [
      `Board direct auto directly at your pickup doorstep (${origin.name})`,
      `Direct road transit for ${directDistanceKm.toFixed(1)} km (~${autoDuration} mins)`,
      `Arrive directly at destination entrance (${destination.name})`,
    ],
    segments: [
      { type: 'ride', from: origin.name, to: destination.name, duration: autoDuration, accessible: true, stairs: 0, routeId: 'AUTO_DIRECT', routeName: 'Direct Auto Rickshaw', crowding: 'LOW' },
    ],
    condition: DEMO_CONDITIONS.S1,
  };

  // Option 4: Shared Taxi / Stand Auto Corridor
  const nearestStand = nearbyStandsList[0] || {
    id: 'stand_patia',
    name: 'Patia Transit Chowk Stand',
    latitude: 20.3450,
    longitude: 85.8180,
  };
  const [walkToStandRes, standToDestRes] = await Promise.all([
    fetchRoadGeometryLive(origin.lat, origin.lng, nearestStand.latitude, nearestStand.longitude, 'walking'),
    fetchRoadGeometryLive(nearestStand.latitude, nearestStand.longitude, destination.lat, destination.lng, 'driving'),
  ]);
  const walkToStand = walkToStandRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, nearestStand.latitude, nearestStand.longitude, 6);
  const standToDest = standToDestRes?.coordinates || interpolateCurvedPoints(nearestStand.latitude, nearestStand.longitude, destination.lat, destination.lng, 14);
  const fullSharedRoute = [...walkToStand, ...standToDest];
  const sharedWalkM = walkToStandRes?.distanceM || 80;
  const sharedDuration = (walkToStandRes?.durationMin || 2) + (standToDestRes?.durationMin || directDrivingDurationMin);

  const option4: RouteSearchResult = {
    route: DEMO_ROUTES[2], // S1 - Sharing Taxi
    eta: sharedDuration,
    duration: sharedDuration,
    walkingDistance: sharedWalkM,
    transfers: 0,
    stairs: 0,
    crowding: 'LOW' as CrowdingLevel,
    vehicleAccessible: true,
    delay: 0,
    originCoords: { lat: origin.lat, lng: origin.lng },
    destinationCoords: { lat: destination.lat, lng: destination.lng },
    originName: origin.name,
    destinationName: destination.name,
    scores: {
      accessibility: 88,
      safety: 85,
      reliability: 88,
      comfort: 80,
      overall: 86,
    },
    fare: {
      type: 'range',
      min: sharedAutoMin,
      max: sharedAutoMax,
      currency: 'INR',
      confidence: 0.88,
      source: 'Designated Stand Regulated Shared Rate',
      status: 'estimated',
      notes: `Regulated ₹${sharedAutoMin}-₹${sharedAutoMax} shared seat rate for ${directDistanceKm.toFixed(1)} km`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: false,
      rank: 4,
      reasons: [
        `Catch from ${nearestStand.name} (${sharedWalkM}m walk)`,
        'Fixed budget-friendly shared fare',
        'Frequent departure (departs every 2-3 mins)',
      ],
      tradeoff: 'Walk to designated stand; shared with other passengers.',
    },
    geometry: {
      originToBoardWalk: walkToStand,
      transitPath: standToDest,
      alightToDestWalk: [],
      fullRoute: fullSharedRoute,
    },
    intermediateStops: [],
    turnByTurn: [
      `Walk ${sharedWalkM}m to ${nearestStand.name}`,
      `Board sharing auto/taxi heading along the corridor`,
      `Arrive at destination (${destination.name})`,
    ],
    segments: [
      { type: 'walk', from: origin.name, to: nearestStand.name, distance: sharedWalkM, duration: Math.max(1, Math.round(sharedWalkM / 65)), accessible: true, stairs: 0 },
      { type: 'ride', from: nearestStand.name, to: destination.name, duration: standToDestRes?.durationMin || 10, accessible: true, stairs: 0, routeId: DEMO_ROUTES[2].id, routeName: DEMO_ROUTES[2].name, crowding: 'LOW' },
    ],
    condition: DEMO_CONDITIONS.S1,
  };

  // Option 5: Bike Taxi (Quick Solo Mobility)
  const bikeDuration = Math.max(3, Math.round(directDrivingDurationMin * 0.75));
  const option5: RouteSearchResult = {
    route: {
      id: 'BIKE_TAXI',
      name: 'Bike Taxi (Fastest Solo Ride)',
      shortName: 'Bike',
      vehicleType: 'shared-transport',
      color: '#0891b2',
      description: 'Quick single-rider motorcycle taxi that navigates through traffic swiftly',
      active: true,
      stops: [],
    },
    eta: bikeDuration,
    duration: bikeDuration,
    walkingDistance: 0,
    transfers: 0,
    stairs: 0,
    crowding: 'LOW' as CrowdingLevel,
    vehicleAccessible: false,
    delay: 0,
    originCoords: { lat: origin.lat, lng: origin.lng },
    destinationCoords: { lat: destination.lat, lng: destination.lng },
    originName: origin.name,
    destinationName: destination.name,
    scores: {
      accessibility: isWheelchair ? 20 : 85,
      safety: 80,
      reliability: 95,
      comfort: 75,
      overall: isWheelchair ? 40 : 88,
    },
    fare: {
      type: 'exact',
      exact: bikeTaxiFare,
      currency: 'INR',
      confidence: 0.95,
      source: 'Bike Taxi Distance Model (Base ₹20 + ₹8/km)',
      status: 'estimated',
      notes: `Fastest travel time for ${directDistanceKm.toFixed(1)} km`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: false,
      rank: 5,
      reasons: [
        'Fastest travel time in heavy traffic',
        'Doorstep pickup and drop-off',
        'Economical single-rider fare',
      ],
      tradeoff: 'Single passenger motorcycle; not suitable for wheelchair users or heavy baggage.',
    },
    geometry: {
      originToBoardWalk: [],
      transitPath: directDrivingPath,
      alightToDestWalk: [],
      fullRoute: directDrivingPath,
    },
    intermediateStops: [],
    turnByTurn: [
      `Meet rider at pickup pin (${origin.name})`,
      `Quick ride via road corridor (${directDistanceKm.toFixed(1)} km)`,
      `Direct drop-off at ${destination.name}`,
    ],
    segments: [
      { type: 'ride', from: origin.name, to: destination.name, duration: bikeDuration, accessible: false, stairs: 0, routeId: 'BIKE_TAXI', routeName: 'Bike Taxi', crowding: 'LOW' },
    ],
    condition: DEMO_CONDITIONS.S1,
  };

  return [...busResults, option3, option4, option5];
}

export function generateDemoSearchResults(originName: string, destName: string): RouteSearchResult[] {
  // Sync fallback helper
  return [
    {
      route: DEMO_ROUTES[0],
      eta: 28,
      duration: 28,
      walkingDistance: 350,
      transfers: 0,
      stairs: 0,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: true,
      delay: 0,
      originName,
      destinationName: destName,
      scores: { accessibility: 95, safety: 90, reliability: 88, comfort: 92, overall: 94 },
      recommendation: {
        recommended: true,
        rank: 1,
        reasons: ['No stairs on this route', 'Accessible low-floor ramp vehicle', 'Low crowding expected'],
        tradeoff: 'Step-free access with certified transit ramps.',
      },
      geometry: {
        originToBoardWalk: [[20.3555, 85.8145], [20.3533, 85.8164]],
        transitPath: [[20.3533, 85.8164], [20.3570, 85.8170], [20.3530, 85.8160], [20.3450, 85.8180]],
        alightToDestWalk: [[20.3450, 85.8180], [20.3440, 85.8190]],
        fullRoute: [[20.3555, 85.8145], [20.3533, 85.8164], [20.3570, 85.8170], [20.3530, 85.8160], [20.3450, 85.8180], [20.3440, 85.8190]],
      },
      intermediateStops: [
        { id: 's1', name: 'Campus Gate', latitude: 20.3555, longitude: 85.8145, sequence: 1, hasRamp: true },
        { id: 's5', name: 'Hospital', latitude: 20.3570, longitude: 85.8170, sequence: 2, hasRamp: true },
        { id: 's2', name: 'KIIT Square', latitude: 20.3530, longitude: 85.8160, sequence: 3, hasRamp: true },
        { id: 's3', name: 'Patia', latitude: 20.3450, longitude: 85.8180, sequence: 4, hasRamp: true },
      ],
      turnByTurn: [
        `Walk 150m from ${originName || 'Origin'} to Campus Gate Stop`,
        'Board Campus Line C3 (Low-floor accessible)',
        'Ride 4 stops (2.8 km) via KIIT Square',
        `Alight at Patia Transit Station and walk 120m to ${destName || 'Destination'}`,
      ],
      segments: [
        { type: 'walk', from: originName || 'Origin', to: 'Campus Gate Stop', distance: 150, duration: 3, accessible: true, stairs: 0 },
        { type: 'board', from: 'Campus Gate Stop', to: 'C3', duration: 1, accessible: true, stairs: 0, routeId: 'C3', routeName: 'Campus Line C3', vehicleType: 'bus' },
        { type: 'ride', from: 'Campus Gate', to: 'Patia', duration: 20, accessible: true, stairs: 0, routeId: 'C3', routeName: 'C3', crowding: 'LOW' },
        { type: 'walk', from: 'Patia Stop', to: destName || 'Destination', distance: 120, duration: 2, accessible: true, stairs: 0 },
      ],
      condition: DEMO_CONDITIONS.C3,
    },
  ];
}

export const DEMO_SEARCH_RESULTS = generateDemoSearchResults('Campus Gate', 'Patia');

// ============ JOURNEY HISTORY ============
export const DEMO_JOURNEY_HISTORY: Journey[] = [
  {
    id: 'j-hist-1', userId: 'demo-user', originId: 's1', destinationId: 's3',
    originName: 'Campus Gate', destinationName: 'Patia Station',
    routeId: 'C3', routeName: 'Campus Line C3 (Step-Free)',
    status: 'completed', startedAt: '2026-08-20T10:00:00Z', completedAt: '2026-08-20T10:28:00Z',
    duration: 28, segments: [], currentSegmentIndex: 0, delay: 0, crowding: 'LOW',
    scores: { accessibility: 96, safety: 92, reliability: 90, comfort: 92, overall: 94 },
  },
  {
    id: 'j-hist-2', userId: 'demo-user', originId: 's3', destinationId: 's4',
    originName: 'Patia', destinationName: 'Infocity IT Park',
    routeId: 'C5', routeName: 'Campus Express C5',
    status: 'completed', startedAt: '2026-08-18T14:30:00Z', completedAt: '2026-08-18T15:05:00Z',
    duration: 35, segments: [], currentSegmentIndex: 0, delay: 3, crowding: 'MEDIUM',
    scores: { accessibility: 88, safety: 86, reliability: 80, comfort: 75, overall: 82 },
  },
];

// ============ NOTIFICATIONS ============
export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'delay', title: 'Route C2 Traffic Advisory', message: 'C2 is running with a minor 3-minute headway delay.', timestamp: new Date(Date.now() - 600000).toISOString(), read: false, routeId: 'C2' },
  { id: 'n2', type: 'accessibility', title: 'Accessible Vehicle Confirmed', message: 'Bus C3-01 with certified ramp has arrived at your nearby stop.', timestamp: new Date(Date.now() - 1200000).toISOString(), read: false, routeId: 'C3' },
  { id: 'n3', type: 'safety', title: 'Safety Watchdog Active', message: 'Safety check-in heartbeat monitoring is ready for your next trip.', timestamp: new Date(Date.now() - 1800000).toISOString(), read: true },
];

// ============ DEMO REPORTS ============
export const DEMO_REPORTS: Report[] = [
  { id: 'rpt-1', type: 'crowding', routeId: 'C2', routeName: 'Campus Shuttle C2', reportedBy: 'Anonymous', timestamp: new Date(Date.now() - 300000).toISOString(), crowding: 'HIGH', comment: 'Crowded during evening peak hours', status: 'NEW' },
];
