// ============================================
// ACCESS — Complete Type System
// ============================================

// --- User & Profile ---
export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
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
  arrivalOffset: number;
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
  delay: number;
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
  // Enhanced Real-world Map & Navigation Geometry
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  originName?: string;
  destinationName?: string;
  geometry?: {
    originToBoardWalk: Array<[number, number]>;
    transitPath: Array<[number, number]>;
    alightToDestWalk: Array<[number, number]>;
    fullRoute: Array<[number, number]>;
  };
  intermediateStops?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    sequence: number;
    hasRamp?: boolean;
  }>;
  turnByTurn?: string[];
  fare?: {
    type: 'exact' | 'range' | 'unknown';
    exact?: number;
    min?: number;
    max?: number;
    currency: string;
    confidence: number;
    source: string;
    status: 'confirmed' | 'estimated' | 'unknown';
    notes?: string;
  };
  nearbyStands?: Array<{
    id: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    address?: string;
    operatingHours?: string;
    distanceM: number;
    typicalFareMin?: number;
    typicalFareMax?: number;
    currency?: string;
  }>;
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
  fare?: {
    type: 'exact' | 'range' | 'unknown';
    exact?: number;
    min?: number;
    max?: number;
    currency: string;
    confidence: number;
    source: string;
  };
  nearbyStands?: Array<{
    id: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    address?: string;
    distanceM: number;
    typicalFareMin?: number;
    typicalFareMax?: number;
    currency?: string;
  }>;
  scores: RouteScores;
  safetySession?: SafetySession;
  currentSegmentIndex: number;
  currentStopId?: string;
  delay: number;
  crowding: CrowdingLevel;
  // Enhanced Real-world Map & Navigation Geometry
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  geometry?: {
    originToBoardWalk: Array<[number, number]>;
    transitPath: Array<[number, number]>;
    alightToDestWalk: Array<[number, number]>;
    fullRoute: Array<[number, number]>;
  };
  intermediateStops?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    sequence: number;
  }>;
  turnByTurn?: string[];
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

// --- Incident Reports ---
export type ReportStatus = 'new' | 'reviewed' | 'resolved' | 'NEW' | 'REVIEWED' | 'RESOLVED';

export interface Report {
  id: string;
  userId?: string;
  userName?: string;
  reportedBy?: string;
  routeId: string;
  routeName?: string;
  type: ReportType;
  crowding?: CrowdingLevel;
  delay?: number;
  delayMinutes?: number;
  accessibilityIssue?: string;
  comment?: string;
  createdAt?: string;
  timestamp?: string;
  status: ReportStatus;
}

export type ReportType = 'crowding' | 'delay' | 'accessibility';

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
  | 'delay'
  | 'crowding'
  | 'accessibility'
  | 'safety'
  | 'reroute'
  | 'general'
  | 'system'
  | 'route-update';

// --- Accessibility UI Settings ---
export interface AccessibilitySettings {
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

// --- Toast ---
export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// --- Live Event & Module Interfaces ---
export interface LiveEvent {
  id: string;
  type: string;
  timestamp: string;
  routeId?: string;
  delay?: number;
  crowding?: CrowdingLevel;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AccessModule {
  id: string;
  name: string;
  version?: string;
  category?: string;
  description: string;
  price?: number;
  rating?: number;
  reviewsCount?: number;
  author?: string;
  endpoints?: Array<{ path: string; method: string; description: string }>;
  installed?: boolean;
  icon?: string;
  color?: string;
  type?: string;
  status?: string;
  provider?: string;
  complexity?: string;
  format?: string;
  stats?: Record<string, unknown>;
}

// --- Module Marketplace ---
export interface TradableModule {
  id: string;
  name: string;
  version: string;
  category: ModuleCategory;
  description: string;
  price: number;
  rating: number;
  reviewsCount: number;
  author: string;
  compatibleWith: string[];
  features: string[];
  installed: boolean;
  icon: string;
  color: string;
  type?: string;
  status?: string;
  provider?: string;
  complexity?: string;
  format?: string;
  endpoints?: Array<{ path: string; method: string; description: string }>;
  stats?: {
    accuracy?: string;
    responseTime?: string;
    uptime?: string;
  };
}

export type ModuleCategory =
  | 'safety'
  | 'scoring'
  | 'crowding'
  | 'navigation'
  | 'notifications'
  | 'reporting';
