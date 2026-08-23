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
  interpolateGreatCirclePoints,
  MAJOR_AIRPORTS,
  MAJOR_RAILWAY_STATIONS,
  findNearestAirport,
  findNearestRailwayStation,
  resolveExactTrainSchedule,
  resolveExactFlightSchedule,
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
    id: 'ts-kp-hub',
    name: 'Campus 12 & KP 7-11 / QC 7-9 Auto Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3568,
    longitude: 85.8162,
    address: 'Near KP-7 Gate, Campus 12 Complex',
    operatingHours: '06:00 - 23:00',
    typicalFareMin: 15,
    typicalFareMax: 30,
    currency: 'INR',
  },
  {
    id: 'ts-c6-lib',
    name: 'Campus 6 Library & QC 5-6 Auto Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3553,
    longitude: 85.8185,
    address: 'Central Library Avenue, Gate 3',
    operatingHours: '06:00 - 23:30',
    typicalFareMin: 15,
    typicalFareMax: 30,
    currency: 'INR',
  },
  {
    id: 'ts-c15-cse',
    name: 'Campus 15 CSE & KP 14-15 Auto Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3530,
    longitude: 85.8245,
    address: 'School of Computer Engineering Gate, Campus 15',
    operatingHours: '06:30 - 22:30',
    typicalFareMin: 15,
    typicalFareMax: 35,
    currency: 'INR',
  },
  {
    id: 'ts-c3-aud',
    name: 'Campus 3 Auditorium & KP 1-2 Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3510,
    longitude: 85.8185,
    address: 'KIIT Gate 2, Main Auditorium Road',
    operatingHours: '06:00 - 23:00',
    typicalFareMin: 15,
    typicalFareMax: 30,
    currency: 'INR',
  },
  {
    id: 'ts-c16-law',
    name: 'Campus 16 Law School & KP 16 Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3602,
    longitude: 85.8242,
    address: 'KIIT School of Law Main Gate, Campus 16',
    operatingHours: '06:30 - 22:00',
    typicalFareMin: 20,
    typicalFareMax: 40,
    currency: 'INR',
  },
  {
    id: 'ts-kims-gate',
    name: 'KIMS Hospital & Medical Gate Taxi Stand',
    type: 'TAXI',
    latitude: 20.3542,
    longitude: 85.8145,
    address: 'KIMS Hospital Emergency & OPD Gate',
    operatingHours: '24 Hours',
    typicalFareMin: 20,
    typicalFareMax: 50,
    currency: 'INR',
  },
  {
    id: 'ts-1',
    name: 'KIIT Square Shared Auto & Taxi Stand',
    type: 'AUTO_RICKSHAW',
    latitude: 20.3540,
    longitude: 85.8168,
    address: 'Near KIIT Gate 1, Chandaka Industrial Estate Road',
    operatingHours: '06:00 - 23:00',
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
 * High-precision Real-World Multi-Tier Transit Chaining Engine
 * Dynamically connects combinations of transport:
 * 1. Local Urban (City Bus, Direct Auto, Shared Stand, Bike Taxi - Distance <= 45km)
 * 2. Regional Intercity (Vande Bharat / Intercity Train + Local Cabs, Deluxe Buses - 45km < D <= 500km)
 * 3. Domestic Long-Distance (Domestic Flight + Airport Cabs, Rajdhani Superfast Train - 500km < D <= 2500km)
 * 4. International Global (Multi-hop Airline Chains via Global Hubs + Airport Express)
 */
export async function generateDynamicSearchResults(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string },
  profileType = 'none',
  baseDepartureTime: Date = new Date(),
): Promise<RouteSearchResult[]> {
  const isWheelchair = profileType === 'wheelchair' || profileType === 'WHEELCHAIR';

  // Calculate geodesic distance
  const directDistanceM = Math.round(haversineDistanceClient(origin.lat, origin.lng, destination.lat, destination.lng));
  const directDistanceKm = Math.max(0.5, directDistanceM / 1000);

  // Check geographic boundaries
  const isDestInIndia = destination.lat >= 6.5 && destination.lat <= 37.5 && destination.lng >= 68.0 && destination.lng <= 97.5;
  const isOriginInIndia = origin.lat >= 6.5 && origin.lat <= 37.5 && origin.lng >= 68.0 && origin.lng <= 97.5;

  let travelScope: 'local' | 'regional' | 'domestic' | 'international' = 'local';
  if (!isDestInIndia || !isOriginInIndia || directDistanceKm > 2200) {
    travelScope = 'international';
  } else if (directDistanceKm > 500) {
    travelScope = 'domestic';
  } else if (directDistanceKm > 45) {
    travelScope = 'regional';
  } else {
    travelScope = 'local';
  }

  // =========================================================================
  // TIER 4: INTERNATIONAL GLOBAL MULTI-HOP FLIGHT COMBINATION
  // =========================================================================
  if (travelScope === 'international') {
    const originAirport = findNearestAirport(origin.lat, origin.lng);
    const destAirport = findNearestAirport(destination.lat, destination.lng);

    // Pick realistic intermediate transit hub
    let layoverHub = MAJOR_AIRPORTS.DXB;
    if (origin.lng > 95 || destination.lng > 95) {
      layoverHub = MAJOR_AIRPORTS.SIN;
    } else if (origin.lat > 40 && destination.lat > 40) {
      layoverHub = MAJOR_AIRPORTS.LHR;
    } else if (isOriginInIndia) {
      layoverHub = directDistanceKm > 4500 ? MAJOR_AIRPORTS.DEL : MAJOR_AIRPORTS.DXB;
    }

    // Flight block hours & realistic international pricing
    const flightHours = Math.max(3.5, Math.round((directDistanceKm / 800) * 10) / 10);
    const layoverHours = 2.5;
    const localEgressHours = 1.5;
    const totalTripDurationMin = Math.round((flightHours + layoverHours + localEgressHours) * 60);

    // Geodesic Flight Paths
    const leg1FlightArc = interpolateGreatCirclePoints(originAirport.lat, originAirport.lng, layoverHub.lat, layoverHub.lng, 18);
    const leg2FlightArc = interpolateGreatCirclePoints(layoverHub.lat, layoverHub.lng, destAirport.lat, destAirport.lng, 22);
    const flightPath = [...leg1FlightArc, ...leg2FlightArc];

    // Local road connections
    const [origRoadRes, destRoadRes] = await Promise.all([
      fetchRoadGeometryLive(origin.lat, origin.lng, originAirport.lat, originAirport.lng, 'driving'),
      fetchRoadGeometryLive(destAirport.lat, destAirport.lng, destination.lat, destination.lng, 'driving'),
    ]);

    const origRoad = origRoadRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, originAirport.lat, originAirport.lng, 8);
    const destRoad = destRoadRes?.coordinates || interpolateCurvedPoints(destAirport.lat, destAirport.lng, destination.lat, destination.lng, 8);
    const fullCombinedRoute = [...origRoad, ...flightPath, ...destRoad];

    const flightSched = resolveExactFlightSchedule(originAirport.code, destAirport.code, originAirport.city, destAirport.city, directDistanceKm);
    const origCabFare = Math.round(350 + (origRoadRes?.distanceM ? (origRoadRes.distanceM / 1000) * 14 : 120));
    const destCabFare = Math.round(450 + (destRoadRes?.distanceM ? (destRoadRes.distanceM / 1000) * 16 : 180));
    const mainFlightFare = Math.max(flightSched.baseFare, Math.round(24000 + directDistanceKm * 4.2));
    const totalIntlTripFare = origCabFare + mainFlightFare + destCabFare;
    const premiumFareInr = Math.round(totalIntlTripFare * 1.35);

    const intlCarrierOption: RouteSearchResult = {
      route: {
        id: 'INTL_FLIGHT_CHAIN',
        name: `${flightSched.airline} (${flightSched.flightNumber}) + Airport Cabs`,
        shortName: `✈️ ${destAirport.code} Flight`,
        vehicleType: 'flight',
        color: '#dc2626',
        description: `Door-to-door: Cab to ${originAirport.name} ➔ ${flightSched.airline} via ${layoverHub.city} (${layoverHub.code}) ➔ Cab to Destination`,
        active: true,
        stops: [],
      },
      eta: totalTripDurationMin,
      duration: totalTripDurationMin,
      walkingDistance: 350,
      transfers: 2,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'international',
      transitChainInfo: {
        carrierName: `${flightSched.airline} (${flightSched.airlineCode})`,
        carrierCode: flightSched.airlineCode,
        flightOrTrainNumber: flightSched.flightNumber,
        originHubName: `${originAirport.name} (${originAirport.code})`,
        originHubCode: originAirport.code,
        destHubName: `${destAirport.name} (${destAirport.code})`,
        destHubCode: destAirport.code,
        layoverHubName: `${layoverHub.name} (${layoverHub.code})`,
        layoverHubCode: layoverHub.code,
        bookingService: `${flightSched.airline} / Google Flights`,
        bookingUrl: flightSched.bookingUrl,
        wheelchairAssistanceCode: 'WCHR / WCHC (Full Special Assistance Included)',
      },
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 98,
        safety: 96,
        reliability: 95,
        comfort: 95,
        overall: 96,
      },
      fare: {
        type: 'exact',
        exact: totalIntlTripFare,
        currency: 'INR',
        confidence: 0.94,
        source: `Total Journey: Cab (₹${origCabFare}) + Flight (₹${mainFlightFare.toLocaleString()}) + Cab (₹${destCabFare})`,
        status: 'estimated',
        notes: `Total combined door-to-door fare for ${directDistanceKm.toLocaleString()} km trip`,
      },
      priceBreakdown: {
        ingressTaxiFare: origCabFare,
        mainTicketFare: mainFlightFare,
        egressTaxiFare: destCabFare,
        totalPrice: totalIntlTripFare,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: `Cab to ${originAirport.name}`, from: origin.name, to: originAirport.name, fare: origCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${originAirport.lat}&dropoff[longitude]=${originAirport.lng}` },
          { mode: 'flight', title: `${flightSched.airline} ${flightSched.flightNumber}`, from: `${originAirport.name} (${originAirport.code})`, to: `${destAirport.name} (${destAirport.code})`, fare: mainFlightFare, bookingUrl: flightSched.bookingUrl, bookingLabel: 'Book Flight Ticket' },
          { mode: 'taxi', title: `Cab from ${destAirport.name} to Destination`, from: destAirport.name, to: destination.name, fare: destCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${destAirport.lat}&pickup[longitude]=${destAirport.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}` },
        ],
      },
      recommendation: {
        recommended: true,
        rank: 1,
        reasons: [
          `Full multi-modal route across ${directDistanceKm.toLocaleString()} km`,
          `Includes local cab to ${originAirport.name} (${originAirport.code})`,
          `${flightSched.airline} (${flightSched.flightNumber}) connecting via ${layoverHub.city}`,
          'Certified wheelchair & step-free assistance throughout',
        ],
        tradeoff: 'Passport and valid visa required for transit hub and destination.',
      },
      geometry: {
        originToBoardWalk: origRoad,
        transitPath: flightPath,
        alightToDestWalk: destRoad,
        fullRoute: fullCombinedRoute,
      },
      intermediateStops: [
        { id: originAirport.code, name: `${originAirport.name} (${originAirport.code})`, latitude: originAirport.lat, longitude: originAirport.lng, sequence: 1, hasRamp: true },
        { id: layoverHub.code, name: `${layoverHub.name} (${layoverHub.code})`, latitude: layoverHub.lat, longitude: layoverHub.lng, sequence: 2, hasRamp: true },
        { id: destAirport.code, name: `${destAirport.name} (${destAirport.code})`, latitude: destAirport.lat, longitude: destAirport.lng, sequence: 3, hasRamp: true },
      ],
      turnByTurn: [
        `Cab transfer from ${origin.name} to ${originAirport.name} (Fare: ₹${origCabFare})`,
        `Depart on ${flightSched.airline} (${flightSched.flightNumber}): ${originAirport.code} ➔ ${layoverHub.code}`,
        `Layover and aircraft transfer at ${layoverHub.name} (${layoverHub.code})`,
        `Depart on Flight Leg 2: ${layoverHub.code} ➔ ${destAirport.code}`,
        `Arrive at ${destAirport.name} & transfer via Cab to ${destination.name} (Fare: ₹${destCabFare})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: originAirport.name, duration: origRoadRes?.durationMin || 35, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_1', routeName: 'Airport Cab Transfer', vehicleType: 'shared-transport', crowding: 'LOW' },
        { type: 'ride', from: originAirport.name, to: layoverHub.name, duration: Math.round(flightHours * 28), accessible: true, stairs: 0, routeId: 'FLIGHT_LEG_1', routeName: `${flightSched.airline} ${flightSched.flightNumber}`, vehicleType: 'flight', crowding: 'LOW' },
        { type: 'ride', from: layoverHub.name, to: destAirport.name, duration: Math.round(flightHours * 32), accessible: true, stairs: 0, routeId: 'FLIGHT_LEG_2', routeName: `Connecting Flight to ${destAirport.code}`, vehicleType: 'flight', crowding: 'LOW' },
        { type: 'ride', from: destAirport.name, to: destination.name, duration: destRoadRes?.durationMin || 40, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_2', routeName: 'Destination Cab', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    const premierOneStopOption: RouteSearchResult = {
      route: {
        id: 'INTL_PREMIER_HUB',
        name: `Emirates / Qatar Airways (${originAirport.code} ➔ ${destAirport.code})`,
        shortName: '✈️ Premier Flight',
        vehicleType: 'flight',
        color: '#9333ea',
        description: `Premium Full-Service Carrier via Dubai / Doha Hub • Dedicated Special Assistance Escort`,
        active: true,
        stops: [],
      },
      eta: totalTripDurationMin + 30,
      duration: totalTripDurationMin + 30,
      walkingDistance: 300,
      transfers: 1,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'international',
      transitChainInfo: {
        carrierName: 'Emirates / Premier Gulf Network',
        carrierCode: 'EK',
        flightOrTrainNumber: 'EK-511 / EK-Connected',
        originHubName: `${originAirport.name} (${originAirport.code})`,
        originHubCode: originAirport.code,
        destHubName: `${destAirport.name} (${destAirport.code})`,
        destHubCode: destAirport.code,
        layoverHubName: `${layoverHub.name} (${layoverHub.code})`,
        layoverHubCode: layoverHub.code,
        bookingService: 'Emirates / Google Flights',
        bookingUrl: `https://www.google.com/travel/flights?q=flights+from+${originAirport.code}+to+${destAirport.code}`,
        wheelchairAssistanceCode: 'WCHR / Full Escort Concierge',
      },
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 99,
        safety: 98,
        reliability: 96,
        comfort: 98,
        overall: 98,
      },
      fare: {
        type: 'exact',
        exact: premiumFareInr,
        currency: 'INR',
        confidence: 0.92,
        source: 'Premium International Carrier Tariff',
        status: 'estimated',
        notes: `Full-service flight with baggage allowance & priority special assistance`,
      },
      priceBreakdown: {
        ingressTaxiFare: origCabFare,
        mainTicketFare: premiumFareInr - origCabFare - destCabFare,
        egressTaxiFare: destCabFare,
        totalPrice: premiumFareInr,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: `Premium Cab to ${originAirport.name}`, from: origin.name, to: originAirport.name, fare: origCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${originAirport.lat}&dropoff[longitude]=${originAirport.lng}` },
          { mode: 'flight', title: `Emirates EK-511 (Widebody Boeing 777)`, from: `${originAirport.name} (${originAirport.code})`, to: `${destAirport.name} (${destAirport.code})`, fare: premiumFareInr - origCabFare - destCabFare, bookingUrl: `https://www.google.com/travel/flights?q=flights+from+${originAirport.code}+to+${destAirport.code}`, bookingLabel: 'Book Emirates Ticket' },
          { mode: 'taxi', title: `Chauffeur Transfer from ${destAirport.name}`, from: destAirport.name, to: destination.name, fare: destCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${destAirport.lat}&pickup[longitude]=${destAirport.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}` },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 2,
        reasons: [
          'Full-service premium widebody airline',
          'Dedicated buggy escort and priority ramp boarding',
          'Seamless connection at major hub airport',
        ],
        tradeoff: 'Higher fare tier.',
      },
      geometry: {
        originToBoardWalk: origRoad,
        transitPath: flightPath,
        alightToDestWalk: destRoad,
        fullRoute: fullCombinedRoute,
      },
      intermediateStops: [
        { id: originAirport.code, name: `${originAirport.name}`, latitude: originAirport.lat, longitude: originAirport.lng, sequence: 1, hasRamp: true },
        { id: layoverHub.code, name: `${layoverHub.name}`, latitude: layoverHub.lat, longitude: layoverHub.lng, sequence: 2, hasRamp: true },
        { id: destAirport.code, name: `${destAirport.name}`, latitude: destAirport.lat, longitude: destAirport.lng, sequence: 3, hasRamp: true },
      ],
      turnByTurn: [
        `Local transfer to ${originAirport.name}`,
        `Flight Leg 1 to ${layoverHub.name}`,
        `Transit at ${layoverHub.name}`,
        `Flight Leg 2 to ${destAirport.name}`,
        `Arrive at ${destination.name}`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: originAirport.name, duration: origRoadRes?.durationMin || 35, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_1', routeName: 'Airport Cab Transfer', vehicleType: 'shared-transport', crowding: 'LOW' },
        { type: 'ride', from: originAirport.name, to: layoverHub.name, duration: Math.round(flightHours * 30), accessible: true, stairs: 0, routeId: 'FLIGHT_DXB_1', routeName: `Flight to ${layoverHub.code}`, vehicleType: 'flight', crowding: 'LOW' },
        { type: 'ride', from: layoverHub.name, to: destAirport.name, duration: Math.round(flightHours * 30), accessible: true, stairs: 0, routeId: 'FLIGHT_DXB_2', routeName: `Flight to ${destAirport.code}`, vehicleType: 'flight', crowding: 'LOW' },
        { type: 'ride', from: destAirport.name, to: destination.name, duration: destRoadRes?.durationMin || 40, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_2', routeName: 'Destination Egress Cab', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    return [intlCarrierOption, premierOneStopOption];
  }

  // =========================================================================
  // TIER 3: DOMESTIC LONG-DISTANCE (DOMESTIC FLIGHT & RAJDHANI EXPRESS RAIL)
  // =========================================================================
  if (travelScope === 'domestic') {
    const originAirport = findNearestAirport(origin.lat, origin.lng);
    const destAirport = findNearestAirport(destination.lat, destination.lng);
    const originStation = findNearestRailwayStation(origin.lat, origin.lng, origin.name.split(',')[0]);
    const destStation = findNearestRailwayStation(destination.lat, destination.lng, destination.name.split(',')[0]);

    // Domestic flight calculation (~750 km/h flight speed + local ingress/egress)
    const flightTimeMin = Math.round(Math.max(65, (directDistanceKm / 750) * 60));
    const [origToAirportRes, destAirportToDestRes] = await Promise.all([
      fetchRoadGeometryLive(origin.lat, origin.lng, originAirport.lat, originAirport.lng, 'driving'),
      fetchRoadGeometryLive(destAirport.lat, destAirport.lng, destination.lat, destination.lng, 'driving'),
    ]);

    const origToAirportPath = origToAirportRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, originAirport.lat, originAirport.lng, 8);
    const destAirportToDestPath = destAirportToDestRes?.coordinates || interpolateCurvedPoints(destAirport.lat, destAirport.lng, destination.lat, destination.lng, 8);
    const flightArc = interpolateGreatCirclePoints(originAirport.lat, originAirport.lng, destAirport.lat, destAirport.lng, 22);

    const fullFlightChainRoute = [...origToAirportPath, ...flightArc, ...destAirportToDestPath];
    const totalFlightDurationMin = (origToAirportRes?.durationMin || 30) + flightTimeMin + 60 + (destAirportToDestRes?.durationMin || 30);

    // Exact Flight Schedule & Total Price Breakdown
    const flightSched = resolveExactFlightSchedule(originAirport.code, destAirport.code, originAirport.city, destAirport.city, directDistanceKm);
    const origFlightCabFare = Math.round(250 + (origToAirportRes?.distanceM ? (origToAirportRes.distanceM / 1000) * 13 : 80));
    const destFlightCabFare = Math.round(300 + (destAirportToDestRes?.distanceM ? (destAirportToDestRes.distanceM / 1000) * 14 : 110));
    const flightTicketFare = flightSched.baseFare;
    const totalAirJourneyPrice = origFlightCabFare + flightTicketFare + destFlightCabFare;

    // Train calculation (Superfast Express ~75 km/h avg)
    const trainHours = Math.round((directDistanceKm / 75) * 10) / 10;
    const [origToStationRes, destStationToDestRes] = await Promise.all([
      fetchRoadGeometryLive(origin.lat, origin.lng, originStation.lat, originStation.lng, 'driving'),
      fetchRoadGeometryLive(destStation.lat, destStation.lng, destination.lat, destination.lng, 'driving'),
    ]);

    const origToStationPath = origToStationRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, originStation.lat, originStation.lng, 8);
    const destStationToDestPath = destStationToDestRes?.coordinates || interpolateCurvedPoints(destStation.lat, destStation.lng, destination.lat, destination.lng, 8);
    const railTrackPath = interpolateCurvedPoints(originStation.lat, originStation.lng, destStation.lat, destStation.lng, 24);

    const fullRailChainRoute = [...origToStationPath, ...railTrackPath, ...destStationToDestPath];
    const totalTrainDurationMin = (origToStationRes?.durationMin || 20) + Math.round(trainHours * 60) + (destStationToDestRes?.durationMin || 20);

    // Exact Train Schedule & Total Price Breakdown
    const trainSched = resolveExactTrainSchedule(originStation.code, destStation.code, originStation.city, destStation.city, directDistanceKm);
    const origTrainCabFare = Math.round(100 + (origToStationRes?.distanceM ? (origToStationRes.distanceM / 1000) * 11 : 40));
    const destTrainCabFare = Math.round(140 + (destStationToDestRes?.distanceM ? (destStationToDestRes.distanceM / 1000) * 12 : 60));
    const trainTicketFare = trainSched.classes[0]?.fare || Math.round(750 + directDistanceKm * 1.25);
    const totalTrainJourneyPrice = origTrainCabFare + trainTicketFare + destTrainCabFare;

    const domesticAirOption: RouteSearchResult = {
      route: {
        id: 'DOMESTIC_AIR_CHAIN',
        name: `${flightSched.airline} (${flightSched.flightNumber}) + Airport Cabs`,
        shortName: `✈️ ${flightSched.flightNumber}`,
        vehicleType: 'flight',
        color: '#0284c7',
        description: `Door-to-door: Cab to ${originAirport.name} ➔ ${flightSched.airline} ${flightSched.flightNumber} ➔ Cab to ${destination.name.split(',')[0]}`,
        active: true,
        stops: [],
      },
      eta: totalFlightDurationMin,
      duration: totalFlightDurationMin,
      walkingDistance: 250,
      transfers: 1,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'domestic',
      transitChainInfo: {
        carrierName: flightSched.airline,
        carrierCode: flightSched.airlineCode,
        flightOrTrainNumber: flightSched.flightNumber,
        originHubName: `${originAirport.name} (${originAirport.code})`,
        originHubCode: originAirport.code,
        destHubName: `${destAirport.name} (${destAirport.code})`,
        destHubCode: destAirport.code,
        bookingService: `${flightSched.airline} / MakeMyTrip`,
        bookingUrl: flightSched.bookingUrl,
        wheelchairAssistanceCode: 'WCHR (Step-Free Boarding Ramp & Escort)',
      },
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 96,
        safety: 95,
        reliability: 94,
        comfort: 93,
        overall: 95,
      },
      fare: {
        type: 'exact',
        exact: totalAirJourneyPrice,
        currency: 'INR',
        confidence: 0.96,
        source: `Total Trip: Cab (₹${origFlightCabFare}) + Flight (₹${flightTicketFare}) + Cab (₹${destFlightCabFare})`,
        status: 'estimated',
        notes: `Total combined door-to-door fare for ${directDistanceKm.toFixed(0)} km corridor (Includes check-in baggage & cabs)`,
      },
      priceBreakdown: {
        ingressTaxiFare: origFlightCabFare,
        mainTicketFare: flightTicketFare,
        egressTaxiFare: destFlightCabFare,
        totalPrice: totalAirJourneyPrice,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: `Cab to ${originAirport.name}`, from: origin.name, to: originAirport.name, fare: origFlightCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${originAirport.lat}&dropoff[longitude]=${originAirport.lng}`, bookingLabel: 'Book Uber to Airport' },
          { mode: 'flight', title: `${flightSched.airline} ${flightSched.flightNumber} (${flightSched.aircraftModel})`, from: `${originAirport.name} (${originAirport.code})`, to: `${destAirport.name} (${destAirport.code})`, fare: flightTicketFare, bookingUrl: flightSched.bookingUrl, bookingLabel: `Book ${flightSched.flightNumber} Ticket` },
          { mode: 'taxi', title: `Cab from ${destAirport.name} to Destination`, from: destAirport.name, to: destination.name, fare: destFlightCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${destAirport.lat}&pickup[longitude]=${destAirport.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Arrival Cab' },
        ],
      },
      recommendation: {
        recommended: true,
        rank: 1,
        reasons: [
          `Fastest travel time: ~${(totalFlightDurationMin / 60).toFixed(1)} hrs door-to-door`,
          `Real daily flight: ${flightSched.airline} ${flightSched.flightNumber} (${flightSched.departureTime})`,
          'Certified wheelchair boarding ramp & ambulift assistance available',
        ],
        tradeoff: 'Airport security and baggage check-in required 60 min before departure.',
      },
      geometry: {
        originToBoardWalk: origToAirportPath,
        transitPath: flightArc,
        alightToDestWalk: destAirportToDestPath,
        fullRoute: fullFlightChainRoute,
      },
      intermediateStops: [
        { id: originAirport.code, name: `${originAirport.name} (${originAirport.code})`, latitude: originAirport.lat, longitude: originAirport.lng, sequence: 1, hasRamp: true },
        { id: destAirport.code, name: `${destAirport.name} (${destAirport.code})`, latitude: destAirport.lat, longitude: destAirport.lng, sequence: 2, hasRamp: true },
      ],
      turnByTurn: [
        `Cab transfer from ${origin.name} to ${originAirport.name} (Fare: ₹${origFlightCabFare}, ${origToAirportRes?.durationMin || 25} min)`,
        `Depart on ${flightSched.airline} (${flightSched.flightNumber}) at ${flightSched.departureTime}: ${originAirport.code} ➔ ${destAirport.code} (~${(flightTimeMin / 60).toFixed(1)} hrs)`,
        `Arrive at ${destAirport.name} & transfer via Cab to ${destination.name} (Fare: ₹${destFlightCabFare})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: originAirport.name, duration: origToAirportRes?.durationMin || 25, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_1', routeName: 'Airport Cab Transfer', vehicleType: 'shared-transport', crowding: 'LOW' },
        { type: 'ride', from: originAirport.name, to: destAirport.name, duration: flightTimeMin, accessible: true, stairs: 0, routeId: 'DOMESTIC_FLIGHT', routeName: `${flightSched.airline} ${flightSched.flightNumber}`, vehicleType: 'flight', crowding: 'LOW' },
        { type: 'ride', from: destAirport.name, to: destination.name, duration: destAirportToDestRes?.durationMin || 30, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_2', routeName: 'Destination Cab', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    const superfastRailOption: RouteSearchResult = {
      route: {
        id: 'IRCTC_SUPERFAST_CHAIN',
        name: `${trainSched.trainName} (${trainSched.trainNumber}) + Station Cabs`,
        shortName: `🚆 ${trainSched.trainNumber}`,
        vehicleType: 'train',
        color: '#b91c1c',
        description: `Door-to-door: Cab to ${originStation.name} ➔ Train ${trainSched.trainNumber} ➔ Cab to Destination`,
        active: true,
        stops: [],
      },
      eta: totalTrainDurationMin,
      duration: totalTrainDurationMin,
      walkingDistance: 250,
      transfers: 1,
      stairs: 0,
      crowding: 'MEDIUM',
      vehicleAccessible: true,
      delay: 5,
      travelScope: 'domestic',
      transitChainInfo: {
        carrierName: 'Indian Railways (IRCTC)',
        carrierCode: 'IRCTC',
        flightOrTrainNumber: `Train ${trainSched.trainNumber} (${trainSched.trainName})`,
        originHubName: `${originStation.name} (${originStation.code})`,
        originHubCode: originStation.code,
        destHubName: `${destStation.name} (${destStation.code})`,
        destHubCode: destStation.code,
        bookingService: 'IRCTC / ConfirmTkt eTicketing',
        bookingUrl: trainSched.bookingUrl,
        wheelchairAssistanceCode: 'IRCTC Divyangjan Sahayak / Platform Ramp Support',
      },
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 91,
        safety: 93,
        reliability: 90,
        comfort: 90,
        overall: 91,
      },
      fare: {
        type: 'exact',
        exact: totalTrainJourneyPrice,
        currency: 'INR',
        confidence: 0.98,
        source: `Total Trip: Cab (₹${origTrainCabFare}) + Train ${trainSched.trainNumber} (₹${trainTicketFare}) + Cab (₹${destTrainCabFare})`,
        status: 'confirmed',
        notes: `Total combined fare for ${directDistanceKm.toFixed(0)} km corridor (Includes station cabs & reserved berth)`,
      },
      priceBreakdown: {
        ingressTaxiFare: origTrainCabFare,
        mainTicketFare: trainTicketFare,
        egressTaxiFare: destTrainCabFare,
        totalPrice: totalTrainJourneyPrice,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: `Cab to ${originStation.name}`, from: origin.name, to: originStation.name, fare: origTrainCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${originStation.lat}&dropoff[longitude]=${originStation.lng}`, bookingLabel: 'Book Cab to Station' },
          { mode: 'train', title: `${trainSched.trainName} (${trainSched.trainNumber})`, from: `${originStation.name} (${originStation.code})`, to: `${destStation.name} (${destStation.code})`, fare: trainTicketFare, bookingUrl: trainSched.bookingUrl, bookingLabel: `Book IRCTC Train ${trainSched.trainNumber}` },
          { mode: 'taxi', title: `Cab from ${destStation.name} to Destination`, from: destStation.name, to: destination.name, fare: destTrainCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${destStation.lat}&pickup[longitude]=${destStation.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Arrival Cab' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 2,
        reasons: [
          `Direct trunk railway link: Train ${trainSched.trainNumber} with reserved sleeping berths`,
          'Official IRCTC government regulated fare with Divyangjan concession',
          `Wheelchair & elevator access at ${originStation.name}`,
        ],
        tradeoff: `Longer travel duration (~${trainHours} hours) compared to flight.`,
      },
      geometry: {
        originToBoardWalk: origToStationPath,
        transitPath: railTrackPath,
        alightToDestWalk: destStationToDestPath,
        fullRoute: fullRailChainRoute,
      },
      intermediateStops: [
        { id: originStation.code, name: `${originStation.name} (${originStation.code})`, latitude: originStation.lat, longitude: originStation.lng, sequence: 1, hasRamp: true },
        { id: destStation.code, name: `${destStation.name} (${destStation.code})`, latitude: destStation.lat, longitude: destStation.lng, sequence: 2, hasRamp: true },
      ],
      turnByTurn: [
        `Cab from ${origin.name} to ${originStation.name} (Fare: ₹${origTrainCabFare}, ${origToStationRes?.durationMin || 15} min)`,
        `Board ${trainSched.trainName} (${trainSched.trainNumber}) at Platform at ${trainSched.departureTime}`,
        `Ride train for ${directDistanceKm.toFixed(0)} km (~${trainHours} hrs)`,
        `Alight at ${destStation.name} and take cab to ${destination.name} (Fare: ₹${destTrainCabFare})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: originStation.name, duration: origToStationRes?.durationMin || 15, accessible: true, stairs: 0, routeId: 'STATION_CAB_1', routeName: 'Station Cab Transfer', vehicleType: 'shared-transport', crowding: 'LOW' },
        { type: 'ride', from: originStation.name, to: destStation.name, duration: Math.round(trainHours * 60), accessible: true, stairs: 0, routeId: 'SUPERFAST_RAIL', routeName: `${trainSched.trainName} (${trainSched.trainNumber})`, vehicleType: 'train', crowding: 'MEDIUM' },
        { type: 'ride', from: destStation.name, to: destination.name, duration: destStationToDestRes?.durationMin || 20, accessible: true, stairs: 0, routeId: 'STATION_CAB_2', routeName: 'Destination Cab', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    const origCarpoolAirFare = Math.round(origFlightCabFare * 0.4);
    const totalCarpoolAirJourneyPrice = origCarpoolAirFare + flightTicketFare + destFlightCabFare;

    const carpoolAirOption: RouteSearchResult = {
      route: {
        id: 'CARPOOL_AIR_CHAIN',
        name: `Carpool to ${originAirport.code} + ${flightSched.airline} (${flightSched.flightNumber}) + Cab`,
        shortName: '🚗✈️ Carpool + Flight',
        vehicleType: 'flight',
        color: '#9333ea',
        description: `Split ride with co-riders to ${originAirport.name} ➔ ${flightSched.airline} ${flightSched.flightNumber} ➔ Airport Cab`,
        active: true,
        stops: [],
      },
      eta: totalFlightDurationMin + 5,
      duration: totalFlightDurationMin + 5,
      walkingDistance: 150,
      transfers: 2,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'domestic',
      transitChainInfo: {
        carrierName: `Carpool Split + ${flightSched.airline}`,
        carrierCode: flightSched.airlineCode,
        flightOrTrainNumber: flightSched.flightNumber,
        originHubName: `${originAirport.name} (${originAirport.code})`,
        originHubCode: originAirport.code,
        destHubName: `${destAirport.name} (${destAirport.code})`,
        destHubCode: destAirport.code,
        bookingService: `${flightSched.airline} / Google Flights`,
        bookingUrl: flightSched.bookingUrl,
        wheelchairAssistanceCode: 'WCHR Assistance & Luggage Space Available',
      },
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 95,
        safety: 96,
        reliability: 94,
        comfort: 94,
        overall: 95,
      },
      fare: {
        type: 'exact',
        exact: totalCarpoolAirJourneyPrice,
        currency: 'INR',
        confidence: 0.96,
        source: `Total Trip: Carpool Split (₹${origCarpoolAirFare}) + Flight (₹${flightTicketFare}) + Cab (₹${destFlightCabFare})`,
        status: 'estimated',
        notes: `Save ₹${origFlightCabFare - origCarpoolAirFare} by sharing airport ride with nearby corridor co-riders`,
      },
      priceBreakdown: {
        ingressTaxiFare: origCarpoolAirFare,
        mainTicketFare: flightTicketFare,
        egressTaxiFare: destFlightCabFare,
        carpoolSplitSavings: origFlightCabFare - origCarpoolAirFare,
        totalPrice: totalCarpoolAirJourneyPrice,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'carpool', title: `Carpool Split to ${originAirport.name}`, from: origin.name, to: originAirport.name, fare: origCarpoolAirFare, bookingLabel: 'View Co-Riders' },
          { mode: 'flight', title: `${flightSched.airline} ${flightSched.flightNumber}`, from: `${originAirport.name} (${originAirport.code})`, to: `${destAirport.name} (${destAirport.code})`, fare: flightTicketFare, bookingUrl: flightSched.bookingUrl, bookingLabel: `Book Flight ${flightSched.flightNumber}` },
          { mode: 'taxi', title: `Cab from ${destAirport.name} to Destination`, from: destAirport.name, to: destination.name, fare: destFlightCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${destAirport.lat}&pickup[longitude]=${destAirport.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Arrival Cab' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 3,
        reasons: [
          `Save ₹${origFlightCabFare - origCarpoolAirFare} by sharing airport cab with verified commuters`,
          `Fast direct flight: ${flightSched.airline} (${flightSched.flightNumber})`,
          'Eco-friendly shared travel reduction in carbon emissions',
        ],
        tradeoff: 'Meet co-rider at designated pickup meeting point.',
      },
      geometry: {
        originToBoardWalk: origToAirportPath,
        transitPath: flightArc,
        alightToDestWalk: destAirportToDestPath,
        fullRoute: fullFlightChainRoute,
      },
      intermediateStops: [
        { id: originAirport.code, name: `${originAirport.name} (${originAirport.code})`, latitude: originAirport.lat, longitude: originAirport.lng, sequence: 1, hasRamp: true },
        { id: destAirport.code, name: `${destAirport.name} (${destAirport.code})`, latitude: destAirport.lat, longitude: destAirport.lng, sequence: 2, hasRamp: true },
      ],
      turnByTurn: [
        `Meet verified co-rider and Carpool to ${originAirport.name} (Split fare: ₹${origCarpoolAirFare})`,
        `Security check-in at ${originAirport.code} Departure Terminal`,
        `Direct Flight: ${flightSched.flightNumber} at ${flightSched.departureTime} (~${(flightTimeMin / 60).toFixed(1)} hrs)`,
        `Arrive at ${destAirport.name} & transfer via Cab to ${destination.name} (Fare: ₹${destFlightCabFare})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: originAirport.name, duration: origToAirportRes?.durationMin || 25, accessible: true, stairs: 0, routeId: 'CARPOOL_AIRPORT', routeName: 'Carpool Ride to Airport', vehicleType: 'shared-transport', crowding: 'LOW' },
        { type: 'ride', from: originAirport.name, to: destAirport.name, duration: flightTimeMin, accessible: true, stairs: 0, routeId: 'DOMESTIC_FLIGHT', routeName: `${flightSched.airline} ${flightSched.flightNumber}`, vehicleType: 'flight', crowding: 'LOW' },
        { type: 'ride', from: destAirport.name, to: destination.name, duration: destAirportToDestRes?.durationMin || 30, accessible: true, stairs: 0, routeId: 'AIRPORT_CAB_2', routeName: 'Destination Cab', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    return [domesticAirOption, superfastRailOption, carpoolAirOption];
  }

  // =========================================================================
  // TIER 2: REGIONAL INTERCITY (VANDE BHARAT / INTERCITY RAIL COMBINATION)
  // =========================================================================
  if (travelScope === 'regional') {
    const originStation = findNearestRailwayStation(origin.lat, origin.lng, origin.name.split(',')[0]);
    const destStation = findNearestRailwayStation(destination.lat, destination.lng, destination.name.split(',')[0]);

    // Intercity Rail Calculation (~75 km/h avg)
    const trainHours = Math.round((directDistanceKm / 75) * 10) / 10;
    const [origToStationRes, destStationToDestRes, directRoadRes] = await Promise.all([
      fetchRoadGeometryLive(origin.lat, origin.lng, originStation.lat, originStation.lng, 'driving'),
      fetchRoadGeometryLive(destStation.lat, destStation.lng, destination.lat, destination.lng, 'driving'),
      fetchRoadGeometryLive(origin.lat, origin.lng, destination.lat, destination.lng, 'driving'),
    ]);

    const origToStationPath = origToStationRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, originStation.lat, originStation.lng, 8);
    const destStationToDestPath = destStationToDestRes?.coordinates || interpolateCurvedPoints(destStation.lat, destStation.lng, destination.lat, destination.lng, 8);
    const railTrackPath = interpolateCurvedPoints(originStation.lat, originStation.lng, destStation.lat, destStation.lng, 20);

    const fullTrainRoute = [...origToStationPath, ...railTrackPath, ...destStationToDestPath];
    const totalTrainDurationMin = (origToStationRes?.durationMin || 15) + Math.round(trainHours * 60) + (destStationToDestRes?.durationMin || 15);

    // Exact Train Schedule & Itemized Fare Breakdown
    const trainSched = resolveExactTrainSchedule(originStation.code, destStation.code, originStation.city, destStation.city, directDistanceKm);
    const origRegCabFare = Math.round(60 + (origToStationRes?.distanceM ? (origToStationRes.distanceM / 1000) * 11 : 30));
    const destRegCabFare = Math.round(80 + (destStationToDestRes?.distanceM ? (destStationToDestRes.distanceM / 1000) * 12 : 40));
    const trainRegTicketFare = trainSched.classes[0]?.fare || Math.round(120 + directDistanceKm * 1.45);
    const totalRegionalTrainPrice = origRegCabFare + trainRegTicketFare + destRegCabFare;

    // OSRTC / Regional Highway Bus
    const directRoadPath = directRoadRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, destination.lat, destination.lng, 20);
    const busHours = Math.round((directDistanceKm / 48) * 10) / 10;
    const busDurationMin = Math.round(busHours * 60) + 15;
    const intercityBusFare = Math.round(65 + directDistanceKm * 1.35);

    // Outstation Cab & Carpool
    const outstationCabFare = Math.round(350 + directDistanceKm * 13.5);
    const outstationCarpoolFare = Math.round(outstationCabFare * 0.35);
    const cabDurationMin = directRoadRes?.durationMin || Math.round((directDistanceKm / 55) * 60);

    const intercityRailOption: RouteSearchResult = {
      route: {
        id: 'IRCTC_VANDE_BHARAT_INTERCITY',
        name: `${trainSched.trainName} (${trainSched.trainNumber}) + Station Cabs`,
        shortName: `🚆 ${trainSched.trainNumber}`,
        vehicleType: 'train',
        color: '#2563eb',
        description: `Door-to-door: Cab to ${originStation.name} ➔ ${trainSched.trainName} ➔ Cab to Destination`,
        active: true,
        stops: [],
      },
      eta: totalTrainDurationMin,
      duration: totalTrainDurationMin,
      walkingDistance: 200,
      transfers: 1,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'regional',
      transitChainInfo: {
        carrierName: 'Indian Railways (IRCTC)',
        carrierCode: 'IRCTC',
        flightOrTrainNumber: `Train ${trainSched.trainNumber} (${trainSched.trainName})`,
        originHubName: `${originStation.name} (${originStation.code})`,
        originHubCode: originStation.code,
        destHubName: `${destStation.name} (${destStation.code})`,
        destHubCode: destStation.code,
        bookingService: 'IRCTC Official / ConfirmTkt',
        bookingUrl: trainSched.bookingUrl,
        wheelchairAssistanceCode: 'Step-Free Station Elevator & Automatic Sliding Doors',
      },
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 96,
        safety: 95,
        reliability: 95,
        comfort: 95,
        overall: 95,
      },
      fare: {
        type: 'exact',
        exact: totalRegionalTrainPrice,
        currency: 'INR',
        confidence: 0.98,
        source: `Total Trip: Cab (₹${origRegCabFare}) + Train ${trainSched.trainNumber} (₹${trainRegTicketFare}) + Cab (₹${destRegCabFare})`,
        status: 'confirmed',
        notes: `Total combined fare for ${directDistanceKm.toFixed(1)} km corridor (Includes station transfers & train ticket)`,
      },
      priceBreakdown: {
        ingressTaxiFare: origRegCabFare,
        mainTicketFare: trainRegTicketFare,
        egressTaxiFare: destRegCabFare,
        totalPrice: totalRegionalTrainPrice,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: `Cab to ${originStation.name}`, from: origin.name, to: originStation.name, fare: origRegCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${originStation.lat}&dropoff[longitude]=${originStation.lng}`, bookingLabel: 'Book Cab to Station' },
          { mode: 'train', title: `${trainSched.trainName} (${trainSched.trainNumber})`, from: `${originStation.name} (${originStation.code})`, to: `${destStation.name} (${destStation.code})`, fare: trainRegTicketFare, bookingUrl: trainSched.bookingUrl, bookingLabel: `Book IRCTC Train ${trainSched.trainNumber}` },
          { mode: 'taxi', title: `Cab from ${destStation.name} to Destination`, from: destStation.name, to: destination.name, fare: destRegCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${destStation.lat}&pickup[longitude]=${destStation.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Arrival Cab' },
        ],
      },
      recommendation: {
        recommended: true,
        rank: 1,
        reasons: [
          `Fastest regional corridor transit: Train ${trainSched.trainNumber} (${trainSched.departureTime})`,
          `100% Step-free station elevator & level platform access at ${originStation.name}`,
          'Government regulated fare with confirmed reservation',
        ],
        tradeoff: `Short local transfer to ${originStation.name}.`,
      },
      geometry: {
        originToBoardWalk: origToStationPath,
        transitPath: railTrackPath,
        alightToDestWalk: destStationToDestPath,
        fullRoute: fullTrainRoute,
      },
      intermediateStops: [
        { id: originStation.code, name: `${originStation.name} (${originStation.code})`, latitude: originStation.lat, longitude: originStation.lng, sequence: 1, hasRamp: true },
        { id: destStation.code, name: `${destStation.name} (${destStation.code})`, latitude: destStation.lat, longitude: destStation.lng, sequence: 2, hasRamp: true },
      ],
      turnByTurn: [
        `Local transfer (Cab) from ${origin.name} to ${originStation.name} (Fare: ₹${origRegCabFare})`,
        `Board ${trainSched.trainName} (${trainSched.trainNumber}) at ${trainSched.departureTime}`,
        `Comfortable rail journey for ${directDistanceKm.toFixed(1)} km (~${trainHours} hrs)`,
        `Alight at ${destStation.name} & transfer via Cab to ${destination.name} (Fare: ₹${destRegCabFare})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: originStation.name, duration: origToStationRes?.durationMin || 15, accessible: true, stairs: 0, routeId: 'LOCAL_CAB_1', routeName: 'Station Cab Transfer', vehicleType: 'shared-transport', crowding: 'LOW' },
        { type: 'ride', from: originStation.name, to: destStation.name, duration: Math.round(trainHours * 60), accessible: true, stairs: 0, routeId: 'INTERCITY_RAIL', routeName: `${trainSched.trainName} (${trainSched.trainNumber})`, vehicleType: 'train', crowding: 'LOW' },
        { type: 'ride', from: destStation.name, to: destination.name, duration: destStationToDestRes?.durationMin || 15, accessible: true, stairs: 0, routeId: 'LOCAL_CAB_2', routeName: 'Destination Transfer', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    const intercityCarpoolOption: RouteSearchResult = {
      route: {
        id: 'INTERCITY_CARPOOL',
        name: `Intercity Carpool Corridor (${origin.name.split(',')[0]} ➔ ${destination.name.split(',')[0]})`,
        shortName: '🚗 Intercity Pool',
        vehicleType: 'shared-transport',
        color: '#9333ea',
        description: 'Verified commuter carpool sharing sedan/SUV ride along intercity highway corridor',
        active: true,
        stops: [],
      },
      eta: cabDurationMin,
      duration: cabDurationMin,
      walkingDistance: 40,
      transfers: 0,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'regional',
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 94,
        safety: 95,
        reliability: 94,
        comfort: 94,
        overall: 95,
      },
      fare: {
        type: 'exact',
        exact: outstationCarpoolFare,
        currency: 'INR',
        confidence: 0.95,
        source: 'Shared Highway Corridor Fare (65% Savings vs Solo Cab)',
        status: 'estimated',
        notes: `₹${outstationCarpoolFare} per seat shared rate (Standard Solo Cab is ₹${outstationCabFare})`,
      },
      priceBreakdown: {
        mainTicketFare: outstationCarpoolFare,
        carpoolSplitSavings: outstationCabFare - outstationCarpoolFare,
        totalPrice: outstationCarpoolFare,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'carpool', title: `Intercity Carpool (${origin.name.split(',')[0]} ➔ ${destination.name.split(',')[0]})`, from: origin.name, to: destination.name, fare: outstationCarpoolFare, bookingLabel: 'Match Co-Riders' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 2,
        reasons: [
          `Save ₹${outstationCabFare - outstationCarpoolFare} compared to solo private outstation cab`,
          'Direct highway ride from designated pickup point',
          'Verified co-riders with emergency tracking',
        ],
        tradeoff: 'Shared ride with up to 3 co-passengers.',
      },
      geometry: {
        originToBoardWalk: [],
        transitPath: directRoadPath,
        alightToDestWalk: [],
        fullRoute: directRoadPath,
      },
      intermediateStops: [],
      turnByTurn: [
        `Meet host at designated accessible pickup point near ${origin.name}`,
        `Highway carpool journey for ${directDistanceKm.toFixed(1)} km (~${cabDurationMin} mins)`,
        `Direct drop-off at destination (${destination.name})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: destination.name, duration: cabDurationMin, accessible: true, stairs: 0, routeId: 'INTERCITY_CARPOOL', routeName: 'Intercity Carpool Ride', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.S1,
    };

    const regionalBusOption: RouteSearchResult = {
      route: {
        id: 'REGIONAL_DELUXE_BUS',
        name: `Intercity AC Deluxe Bus (${origin.name.split(',')[0]} ➔ ${destination.name.split(',')[0]})`,
        shortName: '🚌 Intercity Bus',
        vehicleType: 'bus',
        color: '#059669',
        description: 'State Roadways AC Volvo/Deluxe Coach along major highway corridor',
        active: true,
        stops: [],
      },
      eta: busDurationMin,
      duration: busDurationMin,
      walkingDistance: 150,
      transfers: 0,
      stairs: 1,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'regional',
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 85,
        safety: 90,
        reliability: 92,
        comfort: 88,
        overall: 89,
      },
      fare: {
        type: 'exact',
        exact: intercityBusFare,
        currency: 'INR',
        confidence: 0.98,
        source: 'Official Interstate Bus Tariff Matrix',
        status: 'confirmed',
        notes: `Regulated state bus fare for ${directDistanceKm.toFixed(1)} km`,
      },
      priceBreakdown: {
        mainTicketFare: intercityBusFare,
        totalPrice: intercityBusFare,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'bus', title: `State Roadways AC Bus (${origin.name.split(',')[0]} ➔ ${destination.name.split(',')[0]})`, from: origin.name, to: destination.name, fare: intercityBusFare, bookingUrl: 'https://osrtc.in/', bookingLabel: 'Book Bus Ticket' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 3,
        reasons: [
          'Direct highway service with regular departures',
          'Air-conditioned comfortable coach seating',
          'Accessible main bus terminal departure',
        ],
        tradeoff: 'Subject to highway traffic conditions.',
      },
      geometry: {
        originToBoardWalk: [],
        transitPath: directRoadPath,
        alightToDestWalk: [],
        fullRoute: directRoadPath,
      },
      intermediateStops: [],
      turnByTurn: [
        `Board Intercity Deluxe Bus at pickup bus terminal`,
        `Highway transit for ${directDistanceKm.toFixed(1)} km (~${busHours} hrs)`,
        `Alight at destination terminal (${destination.name})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: destination.name, duration: busDurationMin, accessible: true, stairs: 0, routeId: 'INTERCITY_BUS', routeName: 'Intercity AC Bus', vehicleType: 'bus', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.C3,
    };

    const outstationCabOption: RouteSearchResult = {
      route: {
        id: 'OUTSTATION_CAB',
        name: 'Direct Outstation Cab (Door-to-Door)',
        shortName: '🚖 Outstation Cab',
        vehicleType: 'shared-transport',
        color: '#f59e0b',
        description: 'Private door-to-door AC Sedan cab with dedicated chauffeur (Uber / Ola Outstation)',
        active: true,
        stops: [],
      },
      eta: cabDurationMin,
      duration: cabDurationMin,
      walkingDistance: 0,
      transfers: 0,
      stairs: 0,
      crowding: 'LOW',
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'regional',
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 95,
        safety: 94,
        reliability: 95,
        comfort: 96,
        overall: 95,
      },
      fare: {
        type: 'exact',
        exact: outstationCabFare,
        currency: 'INR',
        confidence: 0.95,
        source: 'Outstation Highway Tariff (Base ₹350 + ₹13.50/km)',
        status: 'estimated',
        notes: `Door-to-door private cab for ${directDistanceKm.toFixed(1)} km`,
      },
      priceBreakdown: {
        mainTicketFare: outstationCabFare,
        totalPrice: outstationCabFare,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: 'Direct Door-to-Door Private AC Cab', from: origin.name, to: destination.name, fare: outstationCabFare, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Outstation Uber' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 4,
        reasons: [
          'Zero walking & zero transfers (Doorstep pickup to destination entrance)',
          'Flexible schedule & instant departure',
          'Private vehicle for comfort and luggage',
        ],
        tradeoff: 'Private outstation vehicle tariff.',
      },
      geometry: {
        originToBoardWalk: [],
        transitPath: directRoadPath,
        alightToDestWalk: [],
        fullRoute: directRoadPath,
      },
      intermediateStops: [],
      turnByTurn: [
        `Board private cab at pickup location (${origin.name})`,
        `Direct highway transit for ${directDistanceKm.toFixed(1)} km (~${cabDurationMin} mins)`,
        `Arrive at destination entrance (${destination.name})`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: destination.name, duration: cabDurationMin, accessible: true, stairs: 0, routeId: 'OUTSTATION_CAB', routeName: 'Outstation Highway Cab', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.S1,
    };

    return [intercityRailOption, intercityCarpoolOption, regionalBusOption, outstationCabOption];
  }

  // =========================================================================
  // TIER 1: LOCAL URBAN (DISTANCE <= 45KM WITHIN CRUT MO BUS NETWORK)
  // =========================================================================

  // 1. DYNAMIC MATCHING ENGINE: Find matching official bus lines in the transit network
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

    // Only accept if both stops are reasonably accessible (< 3.5km walk)
    if (bestBoard && bestAlight && minBoardDist <= 3500 && minAlightDist <= 3500) {
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

  // Take top matching bus candidates
  let topBusCandidates = allCandidateRoutes.slice(0, 2);
  if (topBusCandidates.length === 0) {
    // Default to Route 10 only if within metropolitan radius
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
      travelScope: 'local',
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
  const carpoolSplitFare = Math.max(15, Math.round(autoFareExact * 0.35));
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

  // Check if this is a Campus / Hostel / Local Intra-University Trip
  const isCampusTrip = directDistanceKm <= 4.5 && (
    origin.name.toLowerCase().includes('campus') ||
    origin.name.toLowerCase().includes('kp') ||
    origin.name.toLowerCase().includes('qc') ||
    origin.name.toLowerCase().includes('kiit') ||
    origin.name.toLowerCase().includes('hostel') ||
    origin.name.toLowerCase().includes('palace') ||
    origin.name.toLowerCase().includes('castle') ||
    destination.name.toLowerCase().includes('campus') ||
    destination.name.toLowerCase().includes('kp') ||
    destination.name.toLowerCase().includes('qc') ||
    destination.name.toLowerCase().includes('kiit') ||
    destination.name.toLowerCase().includes('hostel') ||
    destination.name.toLowerCase().includes('palace') ||
    destination.name.toLowerCase().includes('castle')
  );

  // Dedicated Campus & Hostel Commute Options
  if (isCampusTrip) {
    const nearestCampusStand = nearbyStandsList[0] || {
      id: 'stand_campus_hub',
      name: 'KIIT Campus Hub Stand',
      latitude: 20.3540,
      longitude: 85.8168,
      distanceM: 60,
    };

    // =========================================================================
    // OFFICIAL KIIT ECO EV CAMPUS SHUTTLE FLEET (EV Loop 0, EV-1, EV-2, EV-3, EV-4, EV-5)
    // =========================================================================
    const ALL_CAMPUS_EV_LINES = [
      {
        id: 'KIIT_EV_LOOP_0',
        lineName: 'KIIT Eco EV Main Campus Loop',
        shortName: '⚡ Eco EV Loop',
        stops: [
          { id: 'ev_stop_qc1', name: "Queen's Castle 1 (QC 1)", lat: 20.352367, lng: 85.819374, type: 'start_terminus', description: 'Origin EV Starting Stand' },
          { id: 'ev_stop_c17_qc5', name: 'KIIT Campus 17 (QC 5)', lat: 20.349176, lng: 85.819399, type: 'stop', description: 'Campus 17 & QC-5 EV Boarding Bay' },
          { id: 'ev_stop_c15a', name: 'KIIT Campus 15A', lat: 20.348643, lng: 85.815884, type: 'stop', description: 'Campus 15A EV Boarding Bay' },
          { id: 'ev_stop_c3_oat', name: 'KIIT Campus 3 OAT', lat: 20.352709, lng: 85.816379, type: 'end_terminus', description: 'Final Drop Terminus (Open Air Theatre)' },
        ],
      },
      {
        id: 'KIIT_EV_LINE_1',
        lineName: 'KIIT EV-1 (Campus 25 Block C ➔ Campus 13 Entrance)',
        shortName: '⚡ EV-1 Shuttle',
        stops: [
          { id: 'ev_stop_c25', name: 'KIIT Campus 25 Block C', lat: 20.363654, lng: 85.817526, type: 'start_terminus', description: 'Campus 25 Block C Starting Stand' },
          { id: 'ev_stop_c13', name: 'KIIT Campus 13 Entrance', lat: 20.356383, lng: 85.818454, type: 'end_terminus', description: 'Campus 13 Fashion & Media Drop Bay' },
        ],
      },
      {
        id: 'KIIT_EV_LINE_2',
        lineName: 'KIIT EV-2 (Campus 25 Block C ➔ Campus 14 Architecture)',
        shortName: '⚡ EV-2 Shuttle',
        stops: [
          { id: 'ev_stop_c25', name: 'KIIT Campus 25 Block C', lat: 20.363654, lng: 85.817526, type: 'start_terminus', description: 'Campus 25 Block C Starting Stand' },
          { id: 'ev_stop_c14', name: 'KIIT Campus 14 (Architecture)', lat: 20.355989, lng: 85.815397, type: 'end_terminus', description: 'Campus 14 Architecture & Planning Drop Bay' },
        ],
      },
      {
        id: 'KIIT_EV_LINE_3',
        lineName: 'KIIT EV-3 Express (Campus 25 Block C ➔ Campus 14 Architecture)',
        shortName: '⚡ EV-3 Express',
        stops: [
          { id: 'ev_stop_c25', name: 'KIIT Campus 25 Block C', lat: 20.363654, lng: 85.817526, type: 'start_terminus', description: 'Campus 25 Block C Starting Stand' },
          { id: 'ev_stop_c14', name: 'KIIT Campus 14 (Architecture)', lat: 20.355989, lng: 85.815397, type: 'end_terminus', description: 'Campus 14 Architecture Drop Bay' },
        ],
      },
      {
        id: 'KIIT_EV_LINE_4',
        lineName: 'KIIT EV-4 (QC 1 ➔ Campus 11 Biotechnology)',
        shortName: '⚡ EV-4 Shuttle',
        stops: [
          { id: 'ev_stop_qc1', name: "Queen's Castle 1 (QC 1)", lat: 20.352367, lng: 85.819374, type: 'start_terminus', description: 'QC 1 Starting Stand' },
          { id: 'ev_stop_c11', name: 'KIIT Campus 11 (Biotechnology)', lat: 20.358310, lng: 85.821621, type: 'end_terminus', description: 'Campus 11 Biotechnology & TBI Drop Bay' },
        ],
      },
      {
        id: 'KIIT_EV_LINE_5',
        lineName: 'KIIT EV-5 (QC 1 ➔ Campus 12 Film & Media)',
        shortName: '⚡ EV-5 Shuttle',
        stops: [
          { id: 'ev_stop_qc1', name: "Queen's Castle 1 (QC 1)", lat: 20.352367, lng: 85.819374, type: 'start_terminus', description: 'QC 1 Starting Stand' },
          { id: 'ev_stop_c12', name: 'KIIT Campus 12 (Film & Media)', lat: 20.352367, lng: 85.819374, type: 'end_terminus', description: 'Campus 12 Film & Media Sciences Stand' },
        ],
      },
    ];

    // =========================================================================
    // Find an EV pair (board stop -> alight stop) that GENUINELY HELPS the user's specific journey
    // =========================================================================
    let selectedEvLine: typeof ALL_CAMPUS_EV_LINES[0] | null = null;
    let bestEvBoardStop: typeof ALL_CAMPUS_EV_LINES[0]['stops'][0] | null = null;
    let bestEvAlightStop: typeof ALL_CAMPUS_EV_LINES[0]['stops'][0] | null = null;
    let bestJourneyBenefitScore = 0;
    let bestBoardDist = Infinity;
    let bestAlightDist = Infinity;

    // Minimum direct journey distance required for EV to even be considered helpful (>= 350m)
    if (directDistanceM >= 350) {
      for (const line of ALL_CAMPUS_EV_LINES) {
        for (let i = 0; i < line.stops.length; i++) {
          for (let j = 0; j < line.stops.length; j++) {
            if (i === j) continue; // Must be distinct stops

            const stBoard = line.stops[i];
            const stAlight = line.stops[j];

            const boardWalkDist = haversineDistanceClient(origin.lat, origin.lng, stBoard.lat, stBoard.lng);
            const alightWalkDist = haversineDistanceClient(destination.lat, destination.lng, stAlight.lat, stAlight.lng);

            // 1. Proximity Check: Origin must be near boarding stop (<= 300m) AND Destination near drop stop (<= 300m)
            if (boardWalkDist > 300 || alightWalkDist > 300) {
              continue;
            }

            // 2. Forward Progress Check: EV ride must actually move the commuter towards destination
            const distFromBoardToDest = haversineDistanceClient(stBoard.lat, stBoard.lng, destination.lat, destination.lng);
            const distFromAlightToDest = haversineDistanceClient(stAlight.lat, stAlight.lng, destination.lat, destination.lng);
            const forwardProgress = distFromBoardToDest - distFromAlightToDest;

            // Must cut down destination distance by at least 200 meters (no detours or backward loops)
            if (forwardProgress < 200) {
              continue;
            }

            // 3. Efficiency Check: Total walking with EV must be substantially less than direct walk
            const totalWalk = boardWalkDist + alightWalkDist;
            if (totalWalk >= directDistanceM * 0.85) {
              continue;
            }

            // Calculate benefit score: Higher forward progress and shorter walk to boarding point
            const benefitScore = forwardProgress - totalWalk;
            if (benefitScore > bestJourneyBenefitScore) {
              bestJourneyBenefitScore = benefitScore;
              selectedEvLine = line;
              bestEvBoardStop = stBoard;
              bestEvAlightStop = stAlight;
              bestBoardDist = boardWalkDist;
              bestAlightDist = alightWalkDist;
            }
          }
        }
      }
    }

    const isEvNearby = selectedEvLine !== null && bestEvBoardStop !== null && bestEvAlightStop !== null;

    let campusEvShuttleOption: RouteSearchResult | null = null;

    if (isEvNearby && selectedEvLine && bestEvBoardStop && bestEvAlightStop) {
      // Fetch road geometries for selected EV Shuttle
      const [evWalkToBoardRes, evTransitRes, evWalkToDestRes] = await Promise.all([
        fetchRoadGeometryLive(origin.lat, origin.lng, bestEvBoardStop.lat, bestEvBoardStop.lng, 'walking'),
        fetchRoadGeometryLive(bestEvBoardStop.lat, bestEvBoardStop.lng, bestEvAlightStop.lat, bestEvAlightStop.lng, 'driving'),
        fetchRoadGeometryLive(bestEvAlightStop.lat, bestEvAlightStop.lng, destination.lat, destination.lng, 'walking'),
      ]);

      const evWalkToBoard = evWalkToBoardRes?.coordinates || interpolateCurvedPoints(origin.lat, origin.lng, bestEvBoardStop.lat, bestEvBoardStop.lng, 4);
      const evTransitPath = evTransitRes?.coordinates || interpolateCurvedPoints(bestEvBoardStop.lat, bestEvBoardStop.lng, bestEvAlightStop.lat, bestEvAlightStop.lng, 10);
      const evWalkToDest = evWalkToDestRes?.coordinates || interpolateCurvedPoints(bestEvAlightStop.lat, bestEvAlightStop.lng, destination.lat, destination.lng, 4);
      const fullEvRoute = [...evWalkToBoard, ...evTransitPath, ...evWalkToDest];

      const evWalkToBoardDistM = evWalkToBoardRes?.distanceM || Math.round(bestBoardDist);
      const evWalkToDestDistM = evWalkToDestRes?.distanceM || Math.round(bestAlightDist);
      const evTransitTimeMin = evTransitRes?.durationMin || 4;
      const evTotalTimeMin = Math.max(3, (evWalkToBoardRes?.durationMin || 1) + evTransitTimeMin + (evWalkToDestRes?.durationMin || 1));

      campusEvShuttleOption = {
        route: {
          id: selectedEvLine.id,
          name: 'Campus EV',
          shortName: 'Campus EV',
          vehicleType: 'campus-vehicle',
          color: '#10b981',
          description: `Free campus electric vehicle. Leaves from ${bestEvBoardStop.name} ➔ Drops at ${bestEvAlightStop.name}`,
          active: true,
          stops: [],
        },
        eta: evTotalTimeMin,
        duration: evTotalTimeMin,
        walkingDistance: evWalkToBoardDistM + evWalkToDestDistM,
        transfers: 0,
        stairs: 0,
        crowding: 'LOW' as CrowdingLevel,
        vehicleAccessible: true,
        delay: 0,
        travelScope: 'local',
        originCoords: { lat: origin.lat, lng: origin.lng },
        destinationCoords: { lat: destination.lat, lng: destination.lng },
        originName: origin.name,
        destinationName: destination.name,
        scores: {
          accessibility: 98,
          safety: 98,
          reliability: 98,
          comfort: 95,
          overall: 98,
        },
        fare: {
          type: 'exact',
          exact: 0,
          currency: 'INR',
          confidence: 1.0,
          source: 'Free Campus EV Service',
          status: 'confirmed',
          notes: `100% Free Campus Transit • Departs from ${bestEvBoardStop.name}`,
        },
        nearbyStands: nearbyStandsList,
        priceBreakdown: {
          mainTicketFare: 0,
          totalPrice: 0,
          currency: 'INR',
          itemizedLegs: [
            { mode: 'bus', title: `Campus EV (${bestEvBoardStop.name.split('(')[0].trim()} ➔ ${bestEvAlightStop.name.split('(')[0].trim()})`, from: bestEvBoardStop.name, to: bestEvAlightStop.name, fare: 0, bookingLabel: 'Free Campus EV' },
          ],
        },
        recommendation: {
          recommended: true,
          rank: 1,
          reasons: [
            'Free campus electric vehicle: ₹0 fare',
            `Leaves from nearby EV stop: ${bestEvBoardStop.name} (${evWalkToBoardDistM}m walk)`,
            `Drops at ${bestEvAlightStop.name} (${evWalkToDestDistM}m to destination)`,
            'Zero carbon emission & certified low-floor access',
          ],
          tradeoff: `Walk ${evWalkToBoardDistM}m to ${bestEvBoardStop.name}.`,
        },
        geometry: {
          originToBoardWalk: evWalkToBoard,
          transitPath: evTransitPath,
          alightToDestWalk: evWalkToDest,
          fullRoute: fullEvRoute,
        },
        intermediateStops: selectedEvLine.stops.map((s, idx) => ({
          id: s.id,
          name: s.name,
          latitude: s.lat,
          longitude: s.lng,
          sequence: idx + 1,
          hasRamp: true,
        })),
        turnByTurn: [
          `Walk ${evWalkToBoardDistM}m from ${origin.name} to ${bestEvBoardStop.name} EV Stand`,
          `Board Campus EV (Free service)`,
          `Ride EV for ~${evTransitTimeMin} mins to ${bestEvAlightStop.name}`,
          `Alight at ${bestEvAlightStop.name} and walk ${evWalkToDestDistM}m to ${destination.name}`,
        ],
        segments: [
          { type: 'walk', from: origin.name, to: bestEvBoardStop.name, distance: evWalkToBoardDistM, duration: evWalkToBoardRes?.durationMin || 1, accessible: true, stairs: 0, notes: 'Level campus sidewalk' },
          { type: 'board', from: bestEvBoardStop.name, to: 'Campus EV', duration: 1, accessible: true, stairs: 0, routeId: selectedEvLine.id, routeName: 'Campus EV', vehicleType: 'campus-vehicle' },
          { type: 'ride', from: bestEvBoardStop.name, to: bestEvAlightStop.name, duration: evTransitTimeMin, accessible: true, stairs: 0, routeId: selectedEvLine.id, routeName: 'Campus EV', vehicleType: 'campus-vehicle', crowding: 'LOW' },
          { type: 'alight', from: 'Campus EV', to: bestEvAlightStop.name, duration: 1, accessible: true, stairs: 0 },
          { type: 'walk', from: bestEvAlightStop.name, to: destination.name, distance: evWalkToDestDistM, duration: evWalkToDestRes?.durationMin || 1, accessible: true, stairs: 0, notes: 'Paved walkway' },
        ],
        condition: DEMO_CONDITIONS.CV1,
      };
    }

    const campusCarpoolOption: RouteSearchResult = {
      route: {
        id: 'CAMPUS_CARPOOL_MATCH',
        name: 'Student Carpool & Ride Share',
        shortName: '🤝 Student Carpool',
        vehicleType: 'shared-transport',
        color: '#9333ea',
        description: `Share an auto/cab with fellow students traveling between ${origin.name.split('(')[0]} and ${destination.name.split('(')[0]}`,
        active: true,
        stops: [],
      },
      eta: directDrivingDurationMin,
      duration: directDrivingDurationMin,
      walkingDistance: 20,
      transfers: 0,
      stairs: 0,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'local',
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 96,
        safety: 96,
        reliability: 95,
        comfort: 94,
        overall: 96,
      },
      fare: {
        type: 'exact',
        exact: 15,
        currency: 'INR',
        confidence: 0.98,
        source: 'Verified Student Carpool Split Rate',
        status: 'estimated',
        notes: `₹15 split fare per seat (Save ₹15 compared to solo auto)`,
      },
      nearbyStands: nearbyStandsList,
      priceBreakdown: {
        mainTicketFare: 15,
        carpoolSplitSavings: 15,
        totalPrice: 15,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'carpool', title: `Campus Carpool (${origin.name.split('(')[0]} ➔ ${destination.name.split('(')[0]})`, from: origin.name, to: destination.name, fare: 15, bookingLabel: 'Match Student Co-Riders' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 2,
        reasons: [
          'Most economical student commute: ₹15 flat split fare',
          'Instant match with students going to the same hostel/campus',
          'Safe & verified university corridor riders',
        ],
        tradeoff: 'Meet co-riders at the nearest gate/hostel entrance.',
      },
      geometry: {
        originToBoardWalk: [],
        transitPath: directDrivingPath,
        alightToDestWalk: [],
        fullRoute: directDrivingPath,
      },
      intermediateStops: [],
      turnByTurn: [
        `Meet student co-riders at ${origin.name} entrance`,
        `Short campus ride for ${directDistanceKm.toFixed(1)} km (~${directDrivingDurationMin} mins)`,
        `Direct drop-off at ${destination.name}`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: destination.name, duration: directDrivingDurationMin, accessible: true, stairs: 0, routeId: 'CAMPUS_CARPOOL', routeName: 'Student Carpool Ride', vehicleType: 'shared-transport', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.S1,
    };

    const campusBikeTaxiOption: RouteSearchResult = {
      route: {
        id: 'CAMPUS_BIKE_TAXI',
        name: 'Bike Taxi (Rapido / Uber Moto)',
        shortName: '🛵 Bike Taxi',
        vehicleType: 'shared-transport',
        color: '#0891b2',
        description: 'Instant single-rider bike taxi pickup from your hostel or campus gate',
        active: true,
        stops: [],
      },
      eta: Math.max(2, Math.round(directDrivingDurationMin * 0.7)),
      duration: Math.max(2, Math.round(directDrivingDurationMin * 0.7)),
      walkingDistance: 0,
      transfers: 0,
      stairs: 0,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: false,
      delay: 0,
      travelScope: 'local',
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: isWheelchair ? 25 : 90,
        safety: 88,
        reliability: 95,
        comfort: 80,
        overall: isWheelchair ? 45 : 91,
      },
      fare: {
        type: 'exact',
        exact: 20,
        currency: 'INR',
        confidence: 0.98,
        source: 'Instant Bike Tariff (Flat ₹20)',
        status: 'estimated',
        notes: `Quick solo ride for ${directDistanceKm.toFixed(1)} km`,
      },
      nearbyStands: nearbyStandsList,
      priceBreakdown: {
        mainTicketFare: 20,
        totalPrice: 20,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: 'Instant Bike Ride (Rapido / Uber)', from: origin.name, to: destination.name, fare: 20, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Ride' },
        ],
      },
      recommendation: {
        recommended: false,
        rank: 3,
        reasons: [
          `Fastest travel time: ~${Math.max(2, Math.round(directDrivingDurationMin * 0.7))} mins point-to-point`,
          'Doorstep pickup directly at hostel/campus gate',
          'Avoids traffic and road delays',
        ],
        tradeoff: 'Single rider motorcycle commute.',
      },
      geometry: {
        originToBoardWalk: [],
        transitPath: directDrivingPath,
        alightToDestWalk: [],
        fullRoute: directDrivingPath,
      },
      intermediateStops: [],
      turnByTurn: [
        `Board bike taxi at ${origin.name} gate`,
        `Direct quick hop for ${directDistanceKm.toFixed(1)} km (~${Math.max(2, Math.round(directDrivingDurationMin * 0.7))} mins)`,
        `Arrive at ${destination.name}`,
      ],
      segments: [
        { type: 'ride', from: origin.name, to: destination.name, duration: Math.max(2, Math.round(directDrivingDurationMin * 0.7)), accessible: false, stairs: 0, routeId: 'CAMPUS_BIKE', routeName: 'Bike Taxi', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.S1,
    };

    const campusAutoOption: RouteSearchResult = {
      route: {
        id: 'CAMPUS_AUTO_TAXI',
        name: 'Taxi / Auto (Direct Ride)',
        shortName: '🚖 Taxi / Auto',
        vehicleType: 'shared-transport',
        color: '#f59e0b',
        description: `Direct private cab or auto rickshaw from nearest stand (${nearestCampusStand.name.split('/')[0]})`,
        active: true,
        stops: [],
      },
      eta: directDrivingDurationMin,
      duration: directDrivingDurationMin,
      walkingDistance: nearestCampusStand.distanceM || 30,
      transfers: 0,
      stairs: 0,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: true,
      delay: 0,
      travelScope: 'local',
      originCoords: { lat: origin.lat, lng: origin.lng },
      destinationCoords: { lat: destination.lat, lng: destination.lng },
      originName: origin.name,
      destinationName: destination.name,
      scores: {
        accessibility: 95,
        safety: 93,
        reliability: 95,
        comfort: 90,
        overall: 94,
      },
      fare: {
        type: 'exact',
        exact: 30,
        currency: 'INR',
        confidence: 0.98,
        source: `Standard Tariff (${nearestCampusStand.name.split('/')[0]})`,
        status: 'estimated',
        notes: `Flat ₹30 ride fare from ${nearestCampusStand.name.split('/')[0]}`,
      },
      nearbyStands: nearbyStandsList,
      priceBreakdown: {
        mainTicketFare: 30,
        totalPrice: 30,
        currency: 'INR',
        itemizedLegs: [
          { mode: 'taxi', title: `Taxi / Auto from ${nearestCampusStand.name.split('/')[0]}`, from: origin.name, to: destination.name, fare: 30, bookingUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`, bookingLabel: 'Book Ride' },
        ],
      },
      recommendation: {
        recommended: isWheelchair,
        rank: 4,
        reasons: [
          `Nearest pickup: ${nearestCampusStand.name.split('/')[0]} (${nearestCampusStand.distanceM || 30}m away)`,
          'Accommodates up to 3 passengers with baggage or wheelchair',
          'Standard regulated tariff: ₹30',
        ],
        tradeoff: 'Board from nearest stand or request doorstep pickup.',
      },
      geometry: {
        originToBoardWalk: [],
        transitPath: directDrivingPath,
        alightToDestWalk: [],
        fullRoute: directDrivingPath,
      },
      intermediateStops: [],
      turnByTurn: [
        `Walk ${nearestCampusStand.distanceM || 30}m to ${nearestCampusStand.name}`,
        `Board auto rickshaw to ${destination.name}`,
        `Direct arrival at ${destination.name}`,
      ],
      segments: [
        { type: 'walk', from: origin.name, to: nearestCampusStand.name, distance: nearestCampusStand.distanceM || 30, duration: 1, accessible: true, stairs: 0 },
        { type: 'ride', from: nearestCampusStand.name, to: destination.name, duration: directDrivingDurationMin, accessible: true, stairs: 0, routeId: 'CAMPUS_AUTO', routeName: 'Campus Auto', crowding: 'LOW' },
      ],
      condition: DEMO_CONDITIONS.S1,
    };

    if (!campusEvShuttleOption) {
      campusCarpoolOption.recommendation = {
        recommended: true,
        rank: 1,
        reasons: [
          'Most economical student commute: ₹15 flat split fare',
          'Instant match with students going to the same hostel/campus',
          'Safe & verified university corridor riders',
        ],
        tradeoff: 'Meet co-riders at the nearest gate/hostel entrance.',
      };
    }

    const campusResults: RouteSearchResult[] = [
      ...(campusEvShuttleOption ? [campusEvShuttleOption] : []),
      campusCarpoolOption,
      campusBikeTaxiOption,
      campusAutoOption,
    ];

    // If short walk distance <= 1.4 km, also add Step-Free Campus Walkway option
    if (directDistanceKm <= 1.4) {
      const walkDurationMin = Math.max(3, Math.round((directDistanceM / 70)));
      const campusWalkOption: RouteSearchResult = {
        route: {
          id: 'CAMPUS_STEP_FREE_WALK',
          name: 'Step-Free Paved Campus Walkway',
          shortName: '🚶 Campus Walk',
          vehicleType: 'campus-vehicle',
          color: '#10b981',
          description: 'Tree-shaded paved footpath with ramp-equipped road crossings & street illumination',
          active: true,
          stops: [],
        },
        eta: walkDurationMin,
        duration: walkDurationMin,
        walkingDistance: directDistanceM,
        transfers: 0,
        stairs: 0,
        crowding: 'LOW' as CrowdingLevel,
        vehicleAccessible: true,
        delay: 0,
        travelScope: 'local',
        originCoords: { lat: origin.lat, lng: origin.lng },
        destinationCoords: { lat: destination.lat, lng: destination.lng },
        originName: origin.name,
        destinationName: destination.name,
        scores: {
          accessibility: 95,
          safety: 94,
          reliability: 98,
          comfort: 88,
          overall: 93,
        },
        fare: {
          type: 'exact',
          exact: 0,
          currency: 'INR',
          confidence: 1.0,
          source: 'Free Pedestrian Walkway Corridor',
          status: 'confirmed',
          notes: '0 min wait time • Step-free level pathway',
        },
        nearbyStands: nearbyStandsList,
        priceBreakdown: {
          mainTicketFare: 0,
          totalPrice: 0,
          currency: 'INR',
          itemizedLegs: [
            { mode: 'walk', title: 'Step-Free Campus Footpath', from: origin.name, to: destination.name, fare: 0 },
          ],
        },
        recommendation: {
          recommended: false,
          rank: 5,
          reasons: [
            'Zero wait time & 100% free',
            'Continuous paved footpath with ramp curb cuts',
            'Well-lit & secure campus avenue',
          ],
          tradeoff: `Walking commute of ${directDistanceM}m (~${walkDurationMin} min).`,
        },
        geometry: {
          originToBoardWalk: [],
          transitPath: directDrivingPath,
          alightToDestWalk: [],
          fullRoute: directDrivingPath,
        },
        intermediateStops: [],
        turnByTurn: [
          `Walk along paved sidewalk from ${origin.name}`,
          `Follow illuminated campus avenue for ${directDistanceM}m`,
          `Arrive at ${destination.name} entrance`,
        ],
        segments: [
          { type: 'walk', from: origin.name, to: destination.name, distance: directDistanceM, duration: walkDurationMin, accessible: true, stairs: 0, notes: 'Level paved sidewalk' },
        ],
        condition: DEMO_CONDITIONS.CV1,
      };

      campusResults.push(campusWalkOption);
    }

    return campusResults;
  }

  // Option: Local Carpool & Auto Split Match (For General City Trips)
  const carpoolOption: RouteSearchResult = {
    route: {
      id: 'LOCAL_CARPOOL_SPLIT',
      name: 'Local Carpool & Ride Split',
      shortName: '🚗 Carpool',
      vehicleType: 'shared-transport',
      color: '#9333ea',
      description: 'Match with verified co-riders travelling on the same corridor & split fare by 65%',
      active: true,
      stops: [],
    },
    eta: directDrivingDurationMin,
    duration: directDrivingDurationMin,
    walkingDistance: 40,
    transfers: 0,
    stairs: 0,
    crowding: 'LOW' as CrowdingLevel,
    vehicleAccessible: true,
    delay: 0,
    travelScope: 'local',
    originCoords: { lat: origin.lat, lng: origin.lng },
    destinationCoords: { lat: destination.lat, lng: destination.lng },
    originName: origin.name,
    destinationName: destination.name,
    scores: {
      accessibility: 94,
      safety: 95,
      reliability: 94,
      comfort: 92,
      overall: 94,
    },
    fare: {
      type: 'exact',
      exact: carpoolSplitFare,
      currency: 'INR',
      confidence: 0.96,
      source: `Carpool 3-Way Split (Solo fare is ₹${autoFareExact})`,
      status: 'estimated',
      notes: `Split cab/auto ride with nearby commuter — save ₹${autoFareExact - carpoolSplitFare}`,
    },
    nearbyStands: nearbyStandsList,
    recommendation: {
      recommended: false,
      rank: 2,
      reasons: [
        `Save ₹${autoFareExact - carpoolSplitFare} by splitting fare with verified corridor co-riders`,
        'Door-to-door pickup at designated accessible meeting spot',
        'Direct road commute without extra stops',
      ],
      tradeoff: 'Meet co-riders at nearby corridor point.',
    },
    geometry: {
      originToBoardWalk: [],
      transitPath: directDrivingPath,
      alightToDestWalk: [],
      fullRoute: directDrivingPath,
    },
    intermediateStops: [],
    turnByTurn: [
      `Walk 40m to accessible meeting point at ${origin.name}`,
      `Board carpool / split ride with matched co-riders`,
      `Direct transit for ${directDistanceKm.toFixed(1)} km (~${directDrivingDurationMin} mins)`,
      `Arrive at destination (${destination.name})`,
    ],
    segments: [
      { type: 'ride', from: origin.name, to: destination.name, duration: directDrivingDurationMin, accessible: true, stairs: 0, routeId: 'LOCAL_CARPOOL_SPLIT', routeName: 'Local Carpool Split', vehicleType: 'shared-transport', crowding: 'LOW' },
    ],
    condition: DEMO_CONDITIONS.S1,
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
    walkingDistance: 0,
    transfers: 0,
    stairs: 0,
    crowding: 'LOW' as CrowdingLevel,
    vehicleAccessible: true,
    delay: 0,
    travelScope: 'local',
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
    travelScope: 'local',
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
    travelScope: 'local',
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

  return [...busResults, carpoolOption, option3, option4, option5];
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
