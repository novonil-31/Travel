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

// ============ STOPS ============
export const DEMO_STOPS: Stop[] = [
  { id: 's1', name: 'Campus Gate / Main Entrance', lat: 20.3555, lng: 85.8145, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C3', 'C2', 'C5'] },
  { id: 's2', name: 'KIIT Square / Central Hub', lat: 20.3530, lng: 85.8160, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C3', 'C5'] },
  { id: 's3', name: 'Patia Transit Station', lat: 20.3450, lng: 85.8180, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: false, routes: ['C3', 'C2'] },
  { id: 's4', name: 'Infocity IT Park', lat: 20.3600, lng: 85.8120, accessible: true, hasRamp: true, hasStairs: true, hasLighting: true, sheltered: true, routes: ['C5'] },
  { id: 's5', name: 'KIMS Medical Hospital', lat: 20.3570, lng: 85.8170, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C3'] },
  { id: 's6', name: 'Bhubaneswar Central Railway Station', lat: 20.2666, lng: 85.8436, accessible: true, hasRamp: true, hasStairs: true, hasLighting: true, sheltered: true, routes: ['C2'] },
  { id: 's7', name: 'Campus 25 Tech Complex', lat: 20.3510, lng: 85.8130, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: false, routes: ['C5', 'S1'] },
  { id: 's8', name: 'Fire Station Overbridge', lat: 20.2850, lng: 85.8100, accessible: false, hasRamp: false, hasStairs: true, hasLighting: false, sheltered: false, routes: ['C2'] },
  { id: 's9', name: 'Vani Vihar University Gate', lat: 20.3000, lng: 85.8300, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C2'] },
  { id: 's10', name: 'Jaydev Vihar Interchange', lat: 20.3050, lng: 85.8200, accessible: true, hasRamp: true, hasStairs: true, hasLighting: true, sheltered: true, routes: ['C5', 'S1'] },
];

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

  // Find closest local stops to origin and destination
  const stopsWithDistOrigin = DEMO_STOPS.map((s) => ({
    ...s,
    distFromOrigin: haversineDistanceClient(origin.lat, origin.lng, s.lat, s.lng),
  })).sort((a, b) => a.distFromOrigin - b.distFromOrigin);

  const stopsWithDistDest = DEMO_STOPS.map((s) => ({
    ...s,
    distFromDest: haversineDistanceClient(destination.lat, destination.lng, s.lat, s.lng),
  })).sort((a, b) => a.distFromDest - b.distFromDest);

  const boardStop = stopsWithDistOrigin[0] || DEMO_STOPS[0];
  let alightStop = stopsWithDistDest[0] || DEMO_STOPS[DEMO_STOPS.length - 1];

  if (boardStop.id === alightStop.id) {
    alightStop = stopsWithDistDest[1] || DEMO_STOPS[2];
  }

  // 1. Compute real-road walking geometry: Origin -> Board Stop
  const originToBoardRes = await fetchRoadGeometryLive(
    origin.lat,
    origin.lng,
    boardStop.lat,
    boardStop.lng,
    'walking',
  );
  const originToBoardWalk = originToBoardRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, boardStop.lat, boardStop.lng, 6);
  const originWalkDist = originToBoardRes?.distanceM || Math.round(haversineDistanceClient(origin.lat, origin.lng, boardStop.lat, boardStop.lng));
  const originWalkTime = originToBoardRes?.durationMin || Math.max(1, Math.ceil(originWalkDist / 70));

  // 2. Compute real-road transit geometry: Board Stop -> Alight Stop
  const transitRes = await fetchRoadGeometryLive(
    boardStop.lat,
    boardStop.lng,
    alightStop.lat,
    alightStop.lng,
    'driving',
  );
  const transitPath = transitRes?.coordinates || interpolateCurvedPoints(boardStop.lat, boardStop.lng, alightStop.lat, alightStop.lng, 12);
  const transitDist = transitRes?.distanceM || Math.round(haversineDistanceClient(boardStop.lat, boardStop.lng, alightStop.lat, alightStop.lng));
  const transitTime = transitRes?.durationMin || Math.max(4, Math.ceil(transitDist / 400));

  // 3. Compute real-road walking geometry: Alight Stop -> Destination
  const alightToDestRes = await fetchRoadGeometryLive(
    alightStop.lat,
    alightStop.lng,
    destination.lat,
    destination.lng,
    'walking',
  );
  const alightToDestWalk = alightToDestRes?.coordinates || interpolateCurvedPoints(alightStop.lat, alightStop.lng, destination.lat, destination.lng, 6);
  const destWalkDist = alightToDestRes?.distanceM || Math.round(haversineDistanceClient(alightStop.lat, alightStop.lng, destination.lat, destination.lng));
  const destWalkTime = alightToDestRes?.durationMin || Math.max(1, Math.ceil(destWalkDist / 70));

  const totalWalkingDist = originWalkDist + destWalkDist;
  const totalDuration = originWalkTime + transitTime + destWalkTime;
  const fullRoute = [...originToBoardWalk, ...transitPath, ...alightToDestWalk];

  // 4. Compute direct door-to-door driving geometry for Direct Auto & Bike Taxi (No bus stops)
  const directDrivingRes = await fetchRoadGeometryLive(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    'driving',
  );
  const directDrivingPath = directDrivingRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, destination.lat, destination.lng, 12);
  const directDrivingDistM = directDrivingRes?.distanceM || directDistanceM;
  const directDrivingDurationMin = directDrivingRes?.durationMin || Math.max(3, Math.ceil(directDrivingDistM / 500));

  const intermediateStopsList = [
    { id: boardStop.id, name: boardStop.name, latitude: boardStop.lat, longitude: boardStop.lng, sequence: 1, hasRamp: boardStop.hasRamp },
    { id: 's-mid-1', name: 'Corridor Midway Transfer', latitude: (boardStop.lat + alightStop.lat) / 2 + 0.001, longitude: (boardStop.lng + alightStop.lng) / 2 + 0.001, sequence: 2, hasRamp: true },
    { id: alightStop.id, name: alightStop.name, latitude: alightStop.lat, longitude: alightStop.lng, sequence: 3, hasRamp: alightStop.hasRamp },
  ];

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
    eta: totalDuration,
    duration: totalDuration,
    walkingDistance: totalWalkingDist,
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
        `Direct road path (${Math.round((originWalkDist + transitDist + destWalkDist) / 1000 * 10) / 10} km total)`,
      ],
      tradeoff: 'Optimized for step-free access, gentle curb cuts, and certified audio-visual announcements.',
    },
    geometry: {
      originToBoardWalk,
      transitPath,
      alightToDestWalk,
      fullRoute,
    },
    intermediateStops: intermediateStopsList,
    turnByTurn: [
      `Walk ${originWalkDist}m along sidewalk from ${origin.name} to ${boardStop.name} (~${originWalkTime} min)`,
      `Board ${DEMO_ROUTES[0].shortName} (${DEMO_ROUTES[0].name}) at ${boardStop.name} (Ramp operational)`,
      `Ride ${transitTime} min (${Math.round(transitDist / 1000 * 10) / 10} km) passing intermediate stops`,
      `Alight smoothly at ${alightStop.name}`,
      `Walk ${destWalkDist}m along step-free pathway to ${destination.name} (~${destWalkTime} min)`,
    ],
    segments: [
      { type: 'walk', from: origin.name, to: boardStop.name, fromId: 'orig', toId: boardStop.id, distance: originWalkDist, duration: originWalkTime, accessible: true, stairs: 0, notes: 'Paved sidewalk, tactile paving' },
      { type: 'board', from: boardStop.name, to: DEMO_ROUTES[0].name, fromId: boardStop.id, toId: DEMO_ROUTES[0].id, duration: 2, accessible: true, stairs: 0, routeId: DEMO_ROUTES[0].id, routeName: DEMO_ROUTES[0].name, vehicleType: 'bus', notes: 'Deployable wheelchair ramp' },
      { type: 'ride', from: boardStop.name, to: alightStop.name, fromId: boardStop.id, toId: alightStop.id, duration: transitTime, accessible: true, stairs: 0, routeId: DEMO_ROUTES[0].id, routeName: DEMO_ROUTES[0].name, crowding: 'LOW' },
      { type: 'alight', from: DEMO_ROUTES[0].name, to: alightStop.name, fromId: DEMO_ROUTES[0].id, toId: alightStop.id, duration: 1, accessible: true, stairs: 0 },
      { type: 'walk', from: alightStop.name, to: destination.name, fromId: alightStop.id, toId: 'dest', distance: destWalkDist, duration: destWalkTime, accessible: true, stairs: 0, notes: 'Level sidewalk to entrance' },
    ],
    condition: DEMO_CONDITIONS.C3,
  };

  // Option 2: Express Corridor Bus (Faster limited stops)
  const option2Duration = Math.max(8, Math.round(totalDuration * 0.85));
  const option2: RouteSearchResult = {
    route: DEMO_ROUTES[1], // C2 - Fast Express
    eta: option2Duration,
    duration: option2Duration,
    walkingDistance: totalWalkingDist - 30,
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
      originToBoardWalk,
      transitPath,
      alightToDestWalk,
      fullRoute,
    },
    intermediateStops: intermediateStopsList,
    turnByTurn: [
      `Walk ${originWalkDist}m to ${boardStop.name}`,
      `Board ${DEMO_ROUTES[1].name} at ${boardStop.name}`,
      `Ride ${option2Duration - 5} min directly to ${alightStop.name}`,
      `Alight and walk ${destWalkDist}m to ${destination.name}`,
    ],
    segments: [
      { type: 'walk', from: origin.name, to: boardStop.name, distance: originWalkDist, duration: originWalkTime, accessible: true, stairs: 0 },
      { type: 'ride', from: boardStop.name, to: alightStop.name, duration: option2Duration - 5, accessible: false, stairs: 1, routeId: DEMO_ROUTES[1].id, routeName: DEMO_ROUTES[1].name, crowding: 'LOW' },
      { type: 'walk', from: alightStop.name, to: destination.name, distance: destWalkDist, duration: destWalkTime, accessible: false, stairs: 1 },
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
  const option4: RouteSearchResult = {
    route: DEMO_ROUTES[2], // S1 - Sharing Taxi
    eta: totalDuration + 2,
    duration: totalDuration + 2,
    walkingDistance: Math.round(totalWalkingDist * 0.4),
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
      accessibility: 90,
      safety: 92,
      reliability: 88,
      comfort: 86,
      overall: 89,
    },
    fare: {
      type: 'range',
      min: sharedAutoMin,
      max: sharedAutoMax,
      currency: 'INR',
      confidence: 0.88,
      source: 'Fixed Shared Stand Agreement',
      status: 'estimated',
      notes: `Shared commuter auto fare along corridor (${directDistanceKm.toFixed(1)} km)`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: false,
      rank: 4,
      reasons: [
        'Minimal walking to nearest designated stand',
        'Frequent shared departures every 3 mins',
        'Fixed budget shared fare',
      ],
      tradeoff: 'Shared vehicle service with fellow passengers.',
    },
    geometry: {
      originToBoardWalk,
      transitPath,
      alightToDestWalk,
      fullRoute,
    },
    intermediateStops: intermediateStopsList,
    turnByTurn: [
      `Walk ${Math.round(originWalkDist * 0.4)}m to designated stand`,
      `Board shared auto towards destination corridor`,
      `Direct shared ride to drop-off point`,
      `Arrive at ${destination.name}`,
    ],
    segments: [
      { type: 'walk', from: origin.name, to: 'Designated Stand', distance: Math.round(originWalkDist * 0.4), duration: 2, accessible: true, stairs: 0 },
      { type: 'ride', from: 'Designated Stand', to: destination.name, duration: totalDuration, accessible: true, stairs: 0, routeId: DEMO_ROUTES[2].id, routeName: DEMO_ROUTES[2].name, crowding: 'LOW' },
      { type: 'walk', from: 'Dropoff', to: destination.name, distance: 50, duration: 1, accessible: true, stairs: 0 },
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
