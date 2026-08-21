import type {
  Stop, Route, RouteStop, Vehicle, User, TransportCondition,
  RouteSearchResult, RouteScores, RouteRecommendation, Journey,
  JourneySegment, Notification, Report, AccessibilityProfile,
  CrowdingLevel, AccessibilityStatus, VehicleStatusType,
} from '../types';

// ============ STOPS ============
export const DEMO_STOPS: Stop[] = [
  { id: 's1', name: 'Campus Gate', lat: 20.3555, lng: 85.8145, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C3', 'C2', 'C5'] },
  { id: 's2', name: 'KIIT Square', lat: 20.3530, lng: 85.8160, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C3', 'C5'] },
  { id: 's3', name: 'Patia', lat: 20.3450, lng: 85.8180, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: false, routes: ['C3', 'C2'] },
  { id: 's4', name: 'Infocity', lat: 20.3600, lng: 85.8120, accessible: true, hasRamp: true, hasStairs: true, hasLighting: true, sheltered: true, routes: ['C5'] },
  { id: 's5', name: 'Hospital', lat: 20.3570, lng: 85.8170, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C3'] },
  { id: 's6', name: 'Railway Station', lat: 20.2666, lng: 85.8436, accessible: true, hasRamp: true, hasStairs: true, hasLighting: true, sheltered: true, routes: ['C2'] },
  { id: 's7', name: 'Campus 25', lat: 20.3510, lng: 85.8130, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: false, routes: ['C5', 'S1'] },
  { id: 's8', name: 'Fire Station Square', lat: 20.2850, lng: 85.8100, accessible: false, hasRamp: false, hasStairs: true, hasLighting: false, sheltered: false, routes: ['C2'] },
  { id: 's9', name: 'Vani Vihar', lat: 20.3000, lng: 85.8300, accessible: true, hasRamp: true, hasStairs: false, hasLighting: true, sheltered: true, routes: ['C2'] },
  { id: 's10', name: 'Jaydev Vihar', lat: 20.3050, lng: 85.8200, accessible: true, hasRamp: true, hasStairs: true, hasLighting: true, sheltered: true, routes: ['C5', 'S1'] },
];

// ============ ROUTES ============
export const DEMO_ROUTES: Route[] = [
  {
    id: 'C3', name: 'Campus Shuttle C3', shortName: 'C3', vehicleType: 'bus', color: '#059669',
    description: 'Campus Gate to Patia via KIIT Square', active: true,
    stops: [
      { stopId: 's1', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's5', order: 1, arrivalOffset: 8, departureOffset: 9 },
      { stopId: 's2', order: 2, arrivalOffset: 15, departureOffset: 16 },
      { stopId: 's3', order: 3, arrivalOffset: 28, departureOffset: 28 },
    ],
  },
  {
    id: 'C2', name: 'Campus Shuttle C2', shortName: 'C2', vehicleType: 'bus', color: '#2563eb',
    description: 'Campus Gate to Railway Station via Patia', active: true,
    stops: [
      { stopId: 's1', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's3', order: 1, arrivalOffset: 10, departureOffset: 11 },
      { stopId: 's8', order: 2, arrivalOffset: 18, departureOffset: 19 },
      { stopId: 's9', order: 3, arrivalOffset: 22, departureOffset: 22 },
    ],
  },
  {
    id: 'C5', name: 'Campus Express C5', shortName: 'C5', vehicleType: 'bus', color: '#d97706',
    description: 'Infocity to Campus 25 via KIIT Square', active: true,
    stops: [
      { stopId: 's4', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's2', order: 1, arrivalOffset: 12, departureOffset: 13 },
      { stopId: 's10', order: 2, arrivalOffset: 25, departureOffset: 26 },
      { stopId: 's7', order: 3, arrivalOffset: 35, departureOffset: 35 },
    ],
  },
  {
    id: 'S1', name: 'Shared Shuttle S1', shortName: 'S1', vehicleType: 'shared-transport', color: '#7c3aed',
    description: 'Campus 25 to Jaydev Vihar', active: true,
    stops: [
      { stopId: 's7', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's10', order: 1, arrivalOffset: 15, departureOffset: 15 },
    ],
  },
  {
    id: 'CV1', name: 'Campus Vehicle CV1', shortName: 'CV1', vehicleType: 'campus-vehicle', color: '#0891b2',
    description: 'Campus internal shuttle', active: true,
    stops: [
      { stopId: 's1', order: 0, arrivalOffset: 0, departureOffset: 1 },
      { stopId: 's7', order: 1, arrivalOffset: 5, departureOffset: 6 },
      { stopId: 's2', order: 2, arrivalOffset: 10, departureOffset: 10 },
    ],
  },
];

// ============ VEHICLES ============
export const DEMO_VEHICLES: Vehicle[] = [
  { id: 'v1', routeId: 'C3', name: 'C3-Bus-01', type: 'bus', capacity: 40, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's2', lat: 20.3530, lng: 85.8160 },
  { id: 'v2', routeId: 'C2', name: 'C2-Bus-01', type: 'bus', capacity: 40, accessible: true, hasRamp: true, hasLowFloor: false, status: 'active', currentStopId: 's1', lat: 20.3555, lng: 85.8145 },
  { id: 'v3', routeId: 'C2', name: 'C2-Bus-02', type: 'bus', capacity: 40, accessible: false, hasRamp: false, hasLowFloor: false, status: 'active', currentStopId: 's3', lat: 20.3450, lng: 85.8180 },
  { id: 'v4', routeId: 'C5', name: 'C5-Bus-01', type: 'bus', capacity: 35, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's4', lat: 20.3600, lng: 85.8120 },
  { id: 'v5', routeId: 'C5', name: 'C5-Bus-02', type: 'bus', capacity: 35, accessible: false, hasRamp: false, hasLowFloor: false, status: 'delayed', currentStopId: 's10', lat: 20.3050, lng: 85.8200 },
  { id: 'v6', routeId: 'S1', name: 'S1-Van-01', type: 'shared-transport', capacity: 8, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's7', lat: 20.3510, lng: 85.8130 },
  { id: 'v7', routeId: 'CV1', name: 'CV1-Cart-01', type: 'campus-vehicle', capacity: 6, accessible: true, hasRamp: false, hasLowFloor: true, status: 'active', currentStopId: 's1', lat: 20.3555, lng: 85.8145 },
  { id: 'v8', routeId: 'C3', name: 'C3-Bus-02', type: 'bus', capacity: 40, accessible: true, hasRamp: true, hasLowFloor: true, status: 'active', currentStopId: 's5', lat: 20.3570, lng: 85.8170 },
];

// ============ DEFAULT CONDITIONS ============
export const DEMO_CONDITIONS: Record<string, TransportCondition> = {
  C3: { routeId: 'C3', delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  C2: { routeId: 'C2', delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  C5: { routeId: 'C5', delay: 3, crowding: 'MEDIUM', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  S1: { routeId: 'S1', delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
  CV1: { routeId: 'CV1', delay: 0, crowding: 'LOW', accessibility: 'LIMITED', vehicleStatus: 'active', updatedAt: new Date().toISOString() },
};

// ============ DEMO USER ============
export const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Aarav',
  email: 'aarav@example.com',
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
    name: 'Priya',
    phone: '+91 98765 43210',
    relationship: 'Sister',
  },
};

// ============ DEMO SEARCH RESULTS ============
export function generateDemoSearchResults(originName: string, destName: string): RouteSearchResult[] {
  return [
    {
      route: DEMO_ROUTES[0], // C3
      eta: 28,
      duration: 28,
      walkingDistance: 350,
      transfers: 1,
      stairs: 0,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: true,
      delay: 0,
      scores: { accessibility: 92, safety: 88, reliability: 84, comfort: 90, overall: 89 },
      recommendation: {
        recommended: true,
        rank: 1,
        reasons: [
          'No stairs on this route',
          'Accessible vehicle available',
          'Low crowding expected',
          'Short walking distance (350m)',
          'High safety rating',
        ],
        tradeoff: '6 minutes slower than the fastest route, but avoids 2 stair segments and high crowding.',
      },
      segments: [
        { type: 'walk', from: originName || 'Campus Gate', to: 'Campus Gate Stop', fromId: 's1', toId: 's1', distance: 150, duration: 3, accessible: true, stairs: 0, notes: 'Flat path, well-lit' },
        { type: 'board', from: 'Campus Gate Stop', to: 'C3', fromId: 's1', toId: 's1', duration: 1, accessible: true, stairs: 0, routeId: 'C3', routeName: 'Campus Shuttle C3', vehicleType: 'bus', notes: 'Ramp available at boarding' },
        { type: 'ride', from: 'Campus Gate', to: 'KIIT Square', fromId: 's1', toId: 's2', duration: 15, accessible: true, stairs: 0, routeId: 'C3', routeName: 'C3', crowding: 'LOW' },
        { type: 'alight', from: 'C3', to: 'KIIT Square', fromId: 's2', toId: 's2', duration: 1, accessible: true, stairs: 0 },
        { type: 'transfer', from: 'KIIT Square', to: 'KIIT Square', fromId: 's2', toId: 's2', duration: 3, accessible: true, stairs: 0, notes: 'Same platform transfer, no stairs' },
        { type: 'ride', from: 'KIIT Square', to: destName || 'Patia', fromId: 's2', toId: 's3', duration: 12, accessible: true, stairs: 0, routeId: 'C3', routeName: 'C3', crowding: 'LOW' },
        { type: 'walk', from: 'Patia Stop', to: destName || 'Patia', fromId: 's3', toId: 's3', distance: 200, duration: 4, accessible: true, stairs: 0, notes: 'Level sidewalk' },
      ],
      condition: DEMO_CONDITIONS.C3,
    },
    {
      route: DEMO_ROUTES[1], // C2
      eta: 22,
      duration: 22,
      walkingDistance: 280,
      transfers: 0,
      stairs: 2,
      crowding: 'LOW' as CrowdingLevel,
      vehicleAccessible: true,
      delay: 0,
      scores: { accessibility: 65, safety: 82, reliability: 88, comfort: 70, overall: 76 },
      recommendation: {
        recommended: false,
        rank: 2,
        reasons: ['Fastest route available', 'No transfers needed'],
        tradeoff: 'Fastest route but includes 2 stair segments which may not be suitable.',
      },
      segments: [
        { type: 'walk', from: originName || 'Campus Gate', to: 'Campus Gate Stop', fromId: 's1', toId: 's1', distance: 100, duration: 2, accessible: true, stairs: 0 },
        { type: 'board', from: 'Campus Gate Stop', to: 'C2', fromId: 's1', toId: 's1', duration: 1, accessible: true, stairs: 0, routeId: 'C2', routeName: 'Campus Shuttle C2', vehicleType: 'bus' },
        { type: 'ride', from: 'Campus Gate', to: destName || 'Patia', fromId: 's1', toId: 's3', duration: 18, accessible: true, stairs: 2, routeId: 'C2', routeName: 'C2', crowding: 'LOW' },
        { type: 'walk', from: 'Patia Stop', to: destName || 'Patia', fromId: 's3', toId: 's3', distance: 180, duration: 3, accessible: false, stairs: 2, notes: 'Stairs at underpass' },
      ],
      condition: DEMO_CONDITIONS.C2,
    },
    {
      route: DEMO_ROUTES[2], // C5
      eta: 35,
      duration: 35,
      walkingDistance: 500,
      transfers: 2,
      stairs: 0,
      crowding: 'MEDIUM' as CrowdingLevel,
      vehicleAccessible: true,
      delay: 3,
      scores: { accessibility: 78, safety: 75, reliability: 72, comfort: 65, overall: 73 },
      recommendation: {
        recommended: false,
        rank: 3,
        reasons: ['No stairs required', 'Accessible vehicle'],
        tradeoff: 'Accessible but longer journey with moderate crowding and 2 transfers.',
      },
      segments: [
        { type: 'walk', from: originName || 'Campus Gate', to: 'Infocity Stop', fromId: 's1', toId: 's4', distance: 300, duration: 6, accessible: true, stairs: 0 },
        { type: 'board', from: 'Infocity Stop', to: 'C5', fromId: 's4', toId: 's4', duration: 1, accessible: true, stairs: 0, routeId: 'C5', routeName: 'Campus Express C5', vehicleType: 'bus' },
        { type: 'ride', from: 'Infocity', to: 'KIIT Square', fromId: 's4', toId: 's2', duration: 12, accessible: true, stairs: 0, routeId: 'C5', routeName: 'C5', crowding: 'MEDIUM' },
        { type: 'transfer', from: 'KIIT Square', to: 'KIIT Square', fromId: 's2', toId: 's2', duration: 4, accessible: true, stairs: 0 },
        { type: 'ride', from: 'KIIT Square', to: destName || 'Patia', fromId: 's2', toId: 's3', duration: 10, accessible: true, stairs: 0, crowding: 'MEDIUM' },
        { type: 'walk', from: 'Patia Stop', to: destName || 'Patia', fromId: 's3', toId: 's3', distance: 200, duration: 4, accessible: true, stairs: 0 },
      ],
      condition: DEMO_CONDITIONS.C5,
    },
  ];
}

export const DEMO_SEARCH_RESULTS = generateDemoSearchResults('Campus Gate', 'Patia');

// ============ JOURNEY HISTORY ============
export const DEMO_JOURNEY_HISTORY: Journey[] = [
  {
    id: 'j-hist-1', userId: 'demo-user', originId: 's1', destinationId: 's3',
    originName: 'Campus Gate', destinationName: 'Patia',
    routeId: 'C3', routeName: 'Campus Shuttle C3',
    status: 'completed', startedAt: '2026-08-20T10:00:00Z', completedAt: '2026-08-20T10:28:00Z',
    duration: 28, segments: [], currentSegmentIndex: 0, delay: 0, crowding: 'LOW',
    scores: { accessibility: 90, safety: 88, reliability: 86, comfort: 88, overall: 88 },
  },
  {
    id: 'j-hist-2', userId: 'demo-user', originId: 's3', destinationId: 's4',
    originName: 'Patia', destinationName: 'Infocity',
    routeId: 'C5', routeName: 'Campus Express C5',
    status: 'completed', startedAt: '2026-08-18T14:30:00Z', completedAt: '2026-08-18T15:05:00Z',
    duration: 35, segments: [], currentSegmentIndex: 0, delay: 5, crowding: 'MEDIUM',
    scores: { accessibility: 78, safety: 80, reliability: 70, comfort: 72, overall: 75 },
  },
  {
    id: 'j-hist-3', userId: 'demo-user', originId: 's5', destinationId: 's10',
    originName: 'Hospital', destinationName: 'Jaydev Vihar',
    routeId: 'C2', routeName: 'Campus Shuttle C2',
    status: 'completed', startedAt: '2026-08-15T09:15:00Z', completedAt: '2026-08-15T09:40:00Z',
    duration: 25, segments: [], currentSegmentIndex: 0, delay: 0, crowding: 'LOW',
    scores: { accessibility: 85, safety: 90, reliability: 92, comfort: 85, overall: 88 },
  },
];

// ============ NOTIFICATIONS ============
export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'delay', title: 'Route C2 delayed', message: 'C2 is currently 8 minutes late due to traffic.', timestamp: new Date(Date.now() - 600000).toISOString(), read: false, routeId: 'C2' },
  { id: 'n2', type: 'accessibility', title: 'Accessibility update', message: 'C3 accessible vehicle confirmed for your route.', timestamp: new Date(Date.now() - 1200000).toISOString(), read: false, routeId: 'C3' },
  { id: 'n3', type: 'safety', title: 'Safety check-in', message: 'Your safety check-in is due.', timestamp: new Date(Date.now() - 1800000).toISOString(), read: true },
  { id: 'n4', type: 'crowding', title: 'High crowding on C2', message: 'C2 is experiencing high crowding. Consider alternative routes.', timestamp: new Date(Date.now() - 3600000).toISOString(), read: true, routeId: 'C2' },
  { id: 'n5', type: 'system', title: 'Welcome to ACCESS', message: 'Your accessibility profile is ready. Plan your first journey!', timestamp: new Date(Date.now() - 86400000).toISOString(), read: true },
];

// ============ DEMO REPORTS ============
export const DEMO_REPORTS: Report[] = [
  { id: 'rpt-1', type: 'crowding', routeId: 'C2', routeName: 'Campus Shuttle C2', reportedBy: 'Anonymous', timestamp: new Date(Date.now() - 300000).toISOString(), crowding: 'HIGH', comment: 'Very crowded bus, hard to find space', status: 'NEW' },
  { id: 'rpt-2', type: 'delay', routeId: 'C5', routeName: 'Campus Express C5', reportedBy: 'Passenger', timestamp: new Date(Date.now() - 900000).toISOString(), delayMinutes: 8, comment: 'Bus running late', status: 'REVIEWED' },
];
