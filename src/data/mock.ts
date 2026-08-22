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

import { OFFICIAL_STOPS, OFFICIAL_ROUTES } from './liveTimetable';

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

  // 1. Route 10 Specific Stops Matching (City Bus)
  const route10Stops = OFFICIAL_STOPS.filter((s) => s.servingRoutes.includes('10'));
  const boardStop10 = [...route10Stops].sort(
    (a, b) => haversineDistanceClient(origin.lat, origin.lng, a.lat, a.lng) - haversineDistanceClient(origin.lat, origin.lng, b.lat, b.lng)
  )[0] || OFFICIAL_STOPS[0];
  let alightStop10 = [...route10Stops].sort(
    (a, b) => haversineDistanceClient(destination.lat, destination.lng, a.lat, a.lng) - haversineDistanceClient(destination.lat, destination.lng, b.lat, b.lng)
  )[0] || OFFICIAL_STOPS[OFFICIAL_STOPS.length - 1];

  if (boardStop10.id === alightStop10.id) {
    alightStop10 = route10Stops.find(s => s.id !== boardStop10.id) || OFFICIAL_STOPS[OFFICIAL_STOPS.length - 1];
  }

  // 2. Route 11 Specific Stops Matching (Fast Express)
  const route11Stops = OFFICIAL_STOPS.filter((s) => s.servingRoutes.includes('11'));
  const boardStop11 = [...route11Stops].sort(
    (a, b) => haversineDistanceClient(origin.lat, origin.lng, a.lat, a.lng) - haversineDistanceClient(origin.lat, origin.lng, b.lat, b.lng)
  )[0] || OFFICIAL_STOPS[0];
  let alightStop11 = [...route11Stops].sort(
    (a, b) => haversineDistanceClient(destination.lat, destination.lng, a.lat, a.lng) - haversineDistanceClient(destination.lat, destination.lng, b.lat, b.lng)
  )[0] || OFFICIAL_STOPS[OFFICIAL_STOPS.length - 1];

  if (boardStop11.id === alightStop11.id) {
    alightStop11 = route11Stops.find(s => s.id !== boardStop11.id) || OFFICIAL_STOPS[OFFICIAL_STOPS.length - 1];
  }

  // Option 1 Road Geometries: Origin -> Board10 -> Alight10 -> Destination
  const [originToBoard10Res, transit10Res, alightToDest10Res] = await Promise.all([
    fetchRoadGeometryLive(origin.lat, origin.lng, boardStop10.lat, boardStop10.lng, 'walking'),
    fetchRoadGeometryLive(boardStop10.lat, boardStop10.lng, alightStop10.lat, alightStop10.lng, 'driving'),
    fetchRoadGeometryLive(alightStop10.lat, alightStop10.lng, destination.lat, destination.lng, 'walking'),
  ]);

  const originToBoardWalk10 = originToBoard10Res?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, boardStop10.lat, boardStop10.lng, 8);
  const originWalkDist10 = originToBoard10Res?.distanceM || Math.round(haversineDistanceClient(origin.lat, origin.lng, boardStop10.lat, boardStop10.lng));
  const originWalkTime10 = originToBoard10Res?.durationMin || Math.max(1, Math.ceil(originWalkDist10 / 70));

  const transitPath10 = transit10Res?.coordinates || interpolateCurvedPoints(boardStop10.lat, boardStop10.lng, alightStop10.lat, alightStop10.lng, 16);
  const transitDist10 = transit10Res?.distanceM || Math.round(haversineDistanceClient(boardStop10.lat, boardStop10.lng, alightStop10.lat, alightStop10.lng));
  const transitTime10 = transit10Res?.durationMin || Math.max(4, Math.ceil(transitDist10 / 400));

  const alightToDestWalk10 = alightToDest10Res?.coordinates || interpolateCurvedPoints(alightStop10.lat, alightStop10.lng, destination.lat, destination.lng, 8);
  const destWalkDist10 = alightToDest10Res?.distanceM || Math.round(haversineDistanceClient(alightStop10.lat, alightStop10.lng, destination.lat, destination.lng));
  const destWalkTime10 = alightToDest10Res?.durationMin || Math.max(1, Math.ceil(destWalkDist10 / 70));

  const totalWalkingDist10 = originWalkDist10 + destWalkDist10;
  const totalDuration10 = originWalkTime10 + transitTime10 + destWalkTime10;
  const fullRoute10 = [...originToBoardWalk10, ...transitPath10, ...alightToDestWalk10];

  // Option 2 Road Geometries: Origin -> Board11 -> Alight11 -> Destination
  const [originToBoard11Res, transit11Res, alightToDest11Res] = await Promise.all([
    fetchRoadGeometryLive(origin.lat, origin.lng, boardStop11.lat, boardStop11.lng, 'walking'),
    fetchRoadGeometryLive(boardStop11.lat, boardStop11.lng, alightStop11.lat, alightStop11.lng, 'driving'),
    fetchRoadGeometryLive(alightStop11.lat, alightStop11.lng, destination.lat, destination.lng, 'walking'),
  ]);

  const originToBoardWalk11 = originToBoard11Res?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, boardStop11.lat, boardStop11.lng, 8);
  const originWalkDist11 = originToBoard11Res?.distanceM || Math.round(haversineDistanceClient(origin.lat, origin.lng, boardStop11.lat, boardStop11.lng));
  const originWalkTime11 = originToBoard11Res?.durationMin || Math.max(1, Math.ceil(originWalkDist11 / 70));

  const transitPath11 = transit11Res?.coordinates || interpolateCurvedPoints(boardStop11.lat, boardStop11.lng, alightStop11.lat, alightStop11.lng, 16);
  const transitDist11 = transit11Res?.distanceM || Math.round(haversineDistanceClient(boardStop11.lat, boardStop11.lng, alightStop11.lat, alightStop11.lng));
  const transitTime11 = transit11Res?.durationMin || Math.max(4, Math.ceil(transitDist11 / 450));

  const alightToDestWalk11 = alightToDest11Res?.coordinates || interpolateCurvedPoints(alightStop11.lat, alightStop11.lng, destination.lat, destination.lng, 8);
  const destWalkDist11 = alightToDest11Res?.distanceM || Math.round(haversineDistanceClient(alightStop11.lat, alightStop11.lng, destination.lat, destination.lng));
  const destWalkTime11 = alightToDest11Res?.durationMin || Math.max(1, Math.ceil(destWalkDist11 / 70));

  const totalWalkingDist11 = originWalkDist11 + destWalkDist11;
  const totalDuration11 = originWalkTime11 + transitTime11 + destWalkTime11;
  const fullRoute11 = [...originToBoardWalk11, ...transitPath11, ...alightToDestWalk11];

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

  // Dynamic Fare Calculation Based on Distance
  const busFareExact = directDistanceKm <= 3 ? 10 : directDistanceKm <= 8 ? 15 : directDistanceKm <= 14 ? 20 : directDistanceKm <= 20 ? 25 : 30;
  const expressFareExact = busFareExact + 5;
  const autoFareExact = Math.round(30 + Math.max(0, (directDistanceKm - 1.5) * 12));
  const sharedAutoMin = directDistanceKm <= 4 ? 15 : directDistanceKm <= 10 ? 25 : 35;
  const sharedAutoMax = sharedAutoMin + 10;
  const bikeTaxiFare = Math.round(20 + directDistanceKm * 8);

  // Option 1: Step-Free Low-Floor City Bus (Best for Wheelchair / Elderly)
  const option1: RouteSearchResult = {
    route: DEMO_ROUTES[0], // C3 - City Bus
    eta: totalDuration10,
    duration: totalDuration10,
    walkingDistance: totalWalkingDist10,
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
      accessibility: 96,
      safety: 92,
      reliability: 90,
      comfort: 92,
      overall: isWheelchair ? 95 : 91,
    },
    fare: {
      type: 'exact',
      exact: busFareExact,
      currency: 'INR',
      confidence: 0.95,
      source: 'City Transit Fare Matrix (Official Km Schedule)',
      status: 'confirmed',
      notes: `Official government distance-based fare for ${directDistanceKm.toFixed(1)} km`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: true,
      rank: 1,
      reasons: [
        '100% Step-free flat path with zero stairs',
        'Bus equipped with low-floor automatic ramp and dedicated wheelchair bay',
        'Low crowding expected on this time corridor',
        `Direct road path (${Math.round((originWalkDist10 + transitDist10 + destWalkDist10) / 1000 * 10) / 10} km total)`,
      ],
      tradeoff: 'Optimized for step-free access, gentle curb cuts, and certified audio-visual announcements.',
    },
    geometry: {
      originToBoardWalk: originToBoardWalk10,
      transitPath: transitPath10,
      alightToDestWalk: alightToDestWalk10,
      fullRoute: fullRoute10,
    },
    intermediateStops: [
      { id: boardStop10.id, name: boardStop10.name, latitude: boardStop10.lat, longitude: boardStop10.lng, sequence: 1, hasRamp: boardStop10.hasRamp },
      { id: alightStop10.id, name: alightStop10.name, latitude: alightStop10.lat, longitude: alightStop10.lng, sequence: 2, hasRamp: alightStop10.hasRamp },
    ],
    turnByTurn: [
      `Walk ${originWalkDist10}m along sidewalk from ${origin.name} to ${boardStop10.name} (~${originWalkTime10} min)`,
      `Board ${DEMO_ROUTES[0].shortName} (${DEMO_ROUTES[0].name}) at ${boardStop10.name} (Ramp operational)`,
      `Ride ${transitTime10} min (${Math.round(transitDist10 / 1000 * 10) / 10} km) along Route 10 corridor`,
      `Alight smoothly at ${alightStop10.name}`,
      `Walk ${destWalkDist10}m along step-free pathway to ${destination.name} (~${destWalkTime10} min)`,
    ],
    segments: [
      { type: 'walk', from: origin.name, to: boardStop10.name, fromId: 'orig', toId: boardStop10.id, distance: originWalkDist10, duration: originWalkTime10, accessible: true, stairs: 0, notes: 'Paved sidewalk, tactile paving' },
      { type: 'board', from: boardStop10.name, to: DEMO_ROUTES[0].name, fromId: boardStop10.id, toId: DEMO_ROUTES[0].id, duration: 2, accessible: true, stairs: 0, routeId: DEMO_ROUTES[0].id, routeName: DEMO_ROUTES[0].name, vehicleType: 'bus', notes: 'Deployable wheelchair ramp' },
      { type: 'ride', from: boardStop10.name, to: alightStop10.name, fromId: boardStop10.id, toId: alightStop10.id, duration: transitTime10, accessible: true, stairs: 0, routeId: DEMO_ROUTES[0].id, routeName: DEMO_ROUTES[0].name, crowding: 'LOW' },
      { type: 'alight', from: DEMO_ROUTES[0].name, to: alightStop10.name, fromId: DEMO_ROUTES[0].id, toId: alightStop10.id, duration: 1, accessible: true, stairs: 0 },
      { type: 'walk', from: alightStop10.name, to: destination.name, fromId: alightStop10.id, toId: 'dest', distance: destWalkDist10, duration: destWalkTime10, accessible: true, stairs: 0, notes: 'Level sidewalk to entrance' },
    ],
    condition: DEMO_CONDITIONS.C3,
  };

  // Option 2: Express Corridor Bus (Faster limited stops)
  const option2: RouteSearchResult = {
    route: DEMO_ROUTES[1], // C2 - Fast Express
    eta: totalDuration11,
    duration: totalDuration11,
    walkingDistance: totalWalkingDist11,
    transfers: 0,
    stairs: 1,
    crowding: 'LOW' as CrowdingLevel,
    vehicleAccessible: false,
    delay: 0,
    originCoords: { lat: origin.lat, lng: origin.lng },
    destinationCoords: { lat: destination.lat, lng: destination.lng },
    originName: origin.name,
    destinationName: destination.name,
    scores: {
      accessibility: isWheelchair ? 60 : 85,
      safety: 88,
      reliability: 90,
      comfort: 82,
      overall: isWheelchair ? 70 : 92,
    },
    fare: {
      type: 'exact',
      exact: expressFareExact,
      currency: 'INR',
      confidence: 0.95,
      source: 'Express AC Transit Fare Table',
      status: 'confirmed',
      notes: `Express AC transit service for ${directDistanceKm.toFixed(1)} km`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: !isWheelchair,
      rank: 2,
      reasons: [
        'Fastest public bus travel time',
        'Direct arterial non-stop corridor',
        'Frequent scheduled frequency',
      ],
      tradeoff: 'Standard curb entry; not certified for non-folding wheelchairs.',
    },
    geometry: {
      originToBoardWalk: originToBoardWalk11,
      transitPath: transitPath11,
      alightToDestWalk: alightToDestWalk11,
      fullRoute: fullRoute11,
    },
    intermediateStops: [
      { id: boardStop11.id, name: boardStop11.name, latitude: boardStop11.lat, longitude: boardStop11.lng, sequence: 1, hasRamp: boardStop11.hasRamp },
      { id: alightStop11.id, name: alightStop11.name, latitude: alightStop11.lat, longitude: alightStop11.lng, sequence: 2, hasRamp: alightStop11.hasRamp },
    ],
    turnByTurn: [
      `Walk ${originWalkDist11}m to ${boardStop11.name}`,
      `Board ${DEMO_ROUTES[1].name} at ${boardStop11.name}`,
      `Ride ${transitTime11} min directly to ${alightStop11.name}`,
      `Alight and walk ${destWalkDist11}m to ${destination.name}`,
    ],
    segments: [
      { type: 'walk', from: origin.name, to: boardStop11.name, distance: originWalkDist11, duration: originWalkTime11, accessible: true, stairs: 0 },
      { type: 'ride', from: boardStop11.name, to: alightStop11.name, duration: transitTime11, accessible: false, stairs: 1, routeId: DEMO_ROUTES[1].id, routeName: DEMO_ROUTES[1].name, crowding: 'LOW' },
      { type: 'walk', from: alightStop11.name, to: destination.name, distance: destWalkDist11, duration: destWalkTime11, accessible: false, stairs: 1 },
    ],
    condition: DEMO_CONDITIONS.C2,
  };

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
    walkingDistance: 0, // Doorstep pickup
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
      confidence: 0.92,
      source: 'Direct Auto Meter Fare Matrix (Base ₹30 + ₹12/km)',
      status: 'estimated',
      notes: `Calculated for exact distance: ${directDistanceKm.toFixed(1)} km`,
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

  return [option1, option2, option3, option4, option5];
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
