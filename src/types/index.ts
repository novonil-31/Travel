// ============================================
// ACCESS — Complete Type System
// ============================================

// --- User & Profile ---
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  profile: AccessibilityProfile;
  emergencyContact?: EmergencyContact;
  role: 'passenger' | 'operator';
}

export interface AccessibilityProfile {
  mobility: 'wheelchair' | 'walking-difficulty' | 'elderly' | 'none';
  stairs: 'avoid' | 'acceptable';
  walkingTolerance: 'minimal' | 'low' | 'moderate' | 'high';
  crowding: 'avoid' | 'low-preference' | 'acceptable';
  vision: 'low-vision' | 'normal';
  hearing: 'hearing-assistance' | 'normal';
  safetyPreferences: SafetyPreference[];
}

export type SafetyPreference = 'late-night' | 'prefer-safer' | 'safety-sensitive';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// --- Transport Network ---
export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accessible: boolean;
  hasRamp: boolean;
  hasStairs: boolean;
  hasLighting: boolean;
  sheltered: boolean;
  routes: string[];
}

export interface Route {
  id: string;
  name: string;
  shortName: string;
  vehicleType: VehicleType;
  stops: RouteStop[];
  color: string;
  description: string;
  active: boolean;
}

export interface RouteStop {
  stopId: string;
  order: number;
  arrivalOffset: number; // minutes from start
  departureOffset: number;
}

export type VehicleType = 'bus' | 'shared-transport' | 'campus-vehicle';

export interface Vehicle {
  id: string;
  routeId: string;
  name: string;
  type: VehicleType;
  capacity: number;
  accessible: boolean;
  hasRamp: boolean;
  hasLowFloor: boolean;
  status: VehicleStatusType;
  currentStopId?: string;
  lat?: number;
  lng?: number;
}

export type VehicleStatusType = 'active' | 'delayed' | 'out-of-service';

// --- Conditions ---
export type CrowdingLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AccessibilityStatus = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';

export interface TransportCondition {
  routeId: string;
  delay: number; // minutes
  crowding: CrowdingLevel;
  accessibility: AccessibilityStatus;
  vehicleStatus: VehicleStatusType;
  updatedAt: string;
}

// --- Route Scoring ---
export interface RouteSearchResult {
  route: Route;
  eta: number;
  duration: number;
  walkingDistance: number;
  transfers: number;
  stairs: number;
  crowding: CrowdingLevel;
  vehicleAccessible: boolean;
  delay: number;
  scores: RouteScores;
  recommendation: RouteRecommendation;
  segments: JourneySegment[];
  condition: TransportCondition;
}

export interface RouteScores {
  accessibility: number;
  safety: number;
  reliability: number;
  comfort: number;
  overall: number;
}

export interface RouteRecommendation {
  recommended: boolean;
  rank: number;
  reasons: string[];
  tradeoff?: string;
}

// --- Journey ---
export interface Journey {
  id: string;
  userId: string;
  originId: string;
  destinationId: string;
  originName: string;
  destinationName: string;
  routeId: string;
  routeName: string;
  status: JourneyStatus;
  startedAt?: string;
  completedAt?: string;
  eta?: string;
  duration: number;
  segments: JourneySegment[];
  scores: RouteScores;
  safetySession?: SafetySession;
  currentSegmentIndex: number;
  currentStopId?: string;
  delay: number;
  crowding: CrowdingLevel;
}

export type JourneyStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface JourneySegment {
  type: 'walk' | 'board' | 'ride' | 'transfer' | 'alight';
  from: string;
  to: string;
  fromId?: string;
  toId?: string;
  distance?: number;
  duration: number;
  routeId?: string;
  routeName?: string;
  vehicleType?: VehicleType;
  accessible: boolean;
  stairs: number;
  crowding?: CrowdingLevel;
  notes?: string;
}

// --- Safety ---
export interface SafetySession {
  id: string;
  journeyId: string;
  status: SafetyStatus;
  startedAt: string;
  lastCheckIn?: string;
  nextCheckInDue?: string;
  checkInIntervalMinutes: number;
  emergencyContactNotified: boolean;
}

export type SafetyStatus =
  | 'NOT_STARTED'
  | 'ACTIVE'
  | 'CHECK_IN_DUE'
  | 'OVERDUE'
  | 'SAFE'
  | 'EMERGENCY'
  | 'COMPLETED';

// --- Reports ---
export interface Report {
  id: string;
  type: ReportType;
  routeId: string;
  routeName: string;
  reportedBy: string;
  timestamp: string;
  crowding?: CrowdingLevel;
  delayMinutes?: number;
  accessibilityIssue?: string;
  comment?: string;
  status: ReportStatus;
}

export type ReportType = 'crowding' | 'delay' | 'accessibility';
export type ReportStatus = 'NEW' | 'REVIEWED' | 'RESOLVED';

// --- Notifications ---
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  routeId?: string;
  journeyId?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export type NotificationType =
  | 'journey'
  | 'delay'
  | 'crowding'
  | 'accessibility'
  | 'safety'
  | 'system'
  | 'route-update'
  | 'recomputation';

// --- Modules ---
export interface AccessModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'core' | 'acquired' | 'available';
  status: 'CONNECTED' | 'PENDING' | 'DEMO' | 'AVAILABLE';
  version?: string;
  provider?: string;
  endpoints?: ModuleEndpoint[];
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
  format?: string;
}

export interface ModuleEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
}

// --- Events ---
export type LiveEvent =
  | { type: 'ROUTE_DELAY_UPDATED'; routeId: string; delay: number }
  | { type: 'CROWDING_UPDATED'; routeId: string; crowding: CrowdingLevel }
  | { type: 'ACCESSIBILITY_UPDATED'; routeId: string; status: AccessibilityStatus }
  | { type: 'VEHICLE_STATUS_UPDATED'; vehicleId: string; status: VehicleStatusType }
  | { type: 'SAFETY_CHECKIN_DUE'; sessionId: string }
  | { type: 'SAFETY_CHECKIN_OVERDUE'; sessionId: string }
  | { type: 'JOURNEY_COMPLETED'; journeyId: string }
  | { type: 'NOTIFICATION_RECEIVED'; notification: Notification }
  | { type: 'ROUTE_RECOMPUTED'; routeId: string; newRank: number };

// --- UI State ---
export interface AccessibilitySettings {
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
