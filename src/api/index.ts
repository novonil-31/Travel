// ============================================
// API Client — Centralized API layer for ACCESS
// ============================================
// Supports live backend communication (/api/*)
// with complete geocoding, multi-criteria planning, and real-time telemetry.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errMessage = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errMessage = errJson.error.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }

  const json = (await res.json()) as ApiResponse<T>;
  return json.data !== undefined ? json.data : (json as unknown as T);
}

// ============ Auth ============
export const authApi = {
  register: (data: { name: string; email?: string; phoneNumber?: string; password: string }) =>
    request<{ user: { id: string; name: string; email?: string; role: string }; token: string }>(
      '/auth/register',
      { method: 'POST', body: data },
    ),
  login: (data: { email?: string; phoneNumber?: string; password: string }) =>
    request<{ user: { id: string; name: string; email?: string; role: string }; token: string }>(
      '/auth/login',
      { method: 'POST', body: data },
    ),
  getMe: () => request('/auth/me'),
};

// ============ Stops & Geographic Discovery ============
export const stopsApi = {
  getNearby: (lat: number, lng: number, radius = 800) =>
    request(`/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
  getById: (id: string) => request(`/stops/${id}`),
  search: (q: string) => request(`/stops?q=${encodeURIComponent(q)}`),
  searchPlaces: (q: string) => request<Array<{
    displayName: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    isStop?: boolean;
    stopId?: string;
  }>>(`/stops/places/search?q=${encodeURIComponent(q)}`),
  reverseGeocode: (lat: number, lng: number) =>
    request<{ name: string }>(`/stops/places/reverse?lat=${lat}&lng=${lng}`),
};

// ============ Routes ============
export const routesApi = {
  getAll: () => request('/routes'),
  getById: (id: string) => request(`/routes/${id}`),
  search: (params: { q?: string; vehicleType?: string; wheelchair?: boolean }) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.vehicleType) query.set('vehicleType', params.vehicleType);
    if (params.wheelchair !== undefined) query.set('wheelchair', String(params.wheelchair));
    return request(`/routes/search?${query.toString()}`);
  },
  getStops: (id: string) => request(`/routes/${id}/stops`),
};

// ============ Journeys & Multi-Criteria Planning ============
export const journeysApi = {
  plan: (data: {
    origin: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name?: string };
    profileType?: string;
    maxWalkingM?: number;
  }) => request<{
    origin: { lat: number; lng: number; name: string };
    destination: { lat: number; lng: number; name: string };
    options: Array<{
      rank: number;
      routeId: string;
      routeShortName: string;
      routeLongName: string;
      vehicleType: string;
      boardStop: { id: string; name: string; latitude: number; longitude: number; distanceM: number };
      alightStop: { id: string; name: string; latitude: number; longitude: number; distanceM: number };
      intermediateStops: Array<{ id: string; name: string; latitude: number; longitude: number; sequence: number }>;
      departureTime: string | null;
      arrivalTime: string | null;
      durationMinutes: number;
      walkingDistanceM: number;
      walkingTimeMinutes: number;
      eta: { value: string | null; source: string; confidence: number; status: string };
      crowding: { level: string; score: number | null; confidence: number; source: string; status: string };
      fare: { type: string; exact?: number; min?: number; max?: number; currency: string; confidence: number; source: string; status: string };
      accessibility: { wheelchairCompatible: boolean; rampAvailable: boolean | null; lowFloor: boolean; warnings: string[] };
      scores: { overall: number; accessibility: number; safety: number; crowding: number; reliability: number; time: number; cost: number };
      geometry: {
        originToBoardWalk: Array<[number, number]>;
        transitPath: Array<[number, number]>;
        alightToDestWalk: Array<[number, number]>;
        fullRoute: Array<[number, number]>;
      };
      turnByTurn: string[];
      explanation: string[];
      warnings: string[];
      recommendation: string;
    }>;
    profileUsed: string;
    plannedAt: string;
  }>('/journeys/plan', { method: 'POST', body: data }),
  save: (data: unknown) => request('/journeys', { method: 'POST', body: data }),
  start: (journeyId: string) => request(`/journeys/${journeyId}/start`, { method: 'POST' }),
  complete: (journeyId: string) => request(`/journeys/${journeyId}/complete`, { method: 'POST' }),
  getById: (journeyId: string) => request(`/journeys/${journeyId}`),
};

// ============ Profile ============
export const profileApi = {
  get: () => request('/profile'),
  update: (profile: unknown) => request('/profile', { method: 'PUT', body: profile }),
  addEmergencyContact: (data: { name: string; phone: string; relationship: string; isPrimary?: boolean }) =>
    request('/profile/emergency-contacts', { method: 'POST', body: data }),
  deleteEmergencyContact: (id: string) =>
    request(`/profile/emergency-contacts/${id}`, { method: 'DELETE' }),
};

// ============ Reports & Incident Triage ============
export const reportsApi = {
  submitCrowding: (data: { routeId: string; vehicleId?: string; level: string; comment?: string }) =>
    request('/reports/crowding', { method: 'POST', body: data }),
  submitDelay: (data: { routeId: string; delayMinutes: number; comment?: string }) =>
    request('/reports/delay', { method: 'POST', body: data }),
  submitAccessibility: (data: { routeId: string; vehicleId?: string; type: string; issue?: string; comment?: string }) =>
    request('/reports/accessibility', { method: 'POST', body: data }),
  submitCrowdingFeedback: (data: { routeId: string; level: string; journeyId?: string }) =>
    request('/feedback/crowding', { method: 'POST', body: data }),
};

// ============ Proactive Safety ============
export const safetyApi = {
  start: (data: { journeyId: string; expectedArrivalAt: string; heartbeatIntervalMinutes?: number }) =>
    request('/safety/start', { method: 'POST', body: data }),
  heartbeat: (sessionId: string) =>
    request('/safety/heartbeat', { method: 'POST', body: { sessionId } }),
  emergency: (sessionId: string) =>
    request('/safety/emergency', { method: 'POST', body: { sessionId } }),
  complete: (sessionId: string) =>
    request('/safety/complete', { method: 'POST', body: { sessionId } }),
  getById: (sessionId: string) => request(`/safety/${sessionId}`),
};

// ============ Crowding & Fares ============
export const crowdingApi = {
  getByRoute: (routeId: string) => request(`/crowding/route/${routeId}`),
  getByVehicle: (vehicleId: string) => request(`/crowding/vehicle/${vehicleId}`),
};

export const faresApi = {
  estimate: (routeId?: string, originZoneId?: string, destinationZoneId?: string) => {
    const query = new URLSearchParams();
    if (routeId) query.set('routeId', routeId);
    if (originZoneId) query.set('originZoneId', originZoneId);
    if (destinationZoneId) query.set('destinationZoneId', destinationZoneId);
    return request(`/fares/estimate?${query.toString()}`);
  },
};

// ============ Shared Transport ============
export const transportApi = {
  getStandsNearby: (lat: number, lng: number, radius = 1000) =>
    request(`/transport/stands/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
  getCorridorsNearby: (lat: number, lng: number) =>
    request(`/transport/corridors/nearby?lat=${lat}&lng=${lng}`),
};

// ============ Accessibility Evaluation ============
export const evaluateApi = {
  evaluateRoute: (data: { profileType?: string; customProfile?: unknown; route: unknown }) =>
    request('/accessibility/evaluate', { method: 'POST', body: data }),
};

// ============ Notifications ============
export const notificationsApi = {
  getAll: (unreadOnly = false) => request(`/notifications${unreadOnly ? '?unread=true' : ''}`),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
};

export default {
  auth: authApi,
  stops: stopsApi,
  routes: routesApi,
  journeys: journeysApi,
  profile: profileApi,
  reports: reportsApi,
  safety: safetyApi,
  crowding: crowdingApi,
  fares: faresApi,
  transport: transportApi,
  evaluate: evaluateApi,
  notifications: notificationsApi,
};
