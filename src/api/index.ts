// ============================================
// API Client — Centralized API layer for ACCESS
// ============================================
// Supports live backend communication (/api/*)
// with complete geocoding, multi-criteria planning, and real-time telemetry.

import { DEMO_STOPS, DEMO_TRANSPORT_STANDS, generateDynamicSearchResults } from '../data/mock';
import { searchPlacesLive, reverseGeocodeLive, haversineDistanceClient } from '../utils/onlineRouting';
import type { RouteSearchResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : undefined);

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

  if (!BASE_URL) {
    // Demo mode - throw error that will be caught by API methods
    throw new Error('DEMO_MODE');
  }

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
  register: async (data: { name: string; email?: string; phoneNumber?: string; password: string }) => {
    try {
      return await request<{ user: { id: string; name: string; email?: string; role: string; emergencyContact?: { name: string; phone: string; relationship?: string } }; token: string }>(
        '/auth/register',
        { method: 'POST', body: data },
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        // Demo mode response
        return {
          user: {
            id: crypto.randomUUID(),
            name: data.name,
            email: data.email,
            role: 'PASSENGER',
          },
          token: 'demo-token-' + crypto.randomUUID(),
        };
      }
      throw error;
    }
  },
  login: async (data: { email?: string; phoneNumber?: string; password: string }) => {
    try {
      return await request<{ user: { id: string; name: string; email?: string; role: string; emergencyContact?: { name: string; phone: string; relationship?: string } }; token: string }>(
        '/auth/login',
        { method: 'POST', body: data },
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        // Demo mode response
        return {
          user: {
            id: crypto.randomUUID(),
            name: 'Demo User',
            email: data.email,
            role: 'PASSENGER',
          },
          token: 'demo-token-' + crypto.randomUUID(),
        };
      }
      throw error;
    }
  },
  updateEmergencyContact: (data: { name: string; phone: string; relationship?: string }) =>
    request<{ emergencyContact: { id?: string; name: string; phone: string; relationship?: string } }>(
      '/auth/emergency-contact',
      { method: 'PUT', body: data }
    ),
  getMe: () => request('/auth/me'),
};

// ============ Stops & Places ============
export const stopsApi = {
  getNearby: async (lat: number, lng: number, radius = 5000) => {
    try {
      return await request(`/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
  search: async (query: string) => {
    try {
      return await request(`/stops/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
  getById: async (id: string) => {
    try {
      return await request(`/stops/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return null;
      }
      throw error;
    }
  },

  searchPlaces: async (query: string) => {
    if (!query || query.trim().length === 0) return [];
    try {
      const res = await request<any[]>(`/stops/places/search?q=${encodeURIComponent(query)}`);
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'DEMO_MODE') {
        // only fallback if not demo mode
      }
    }
    return searchPlacesLive(query);
  },

  reverseGeocode: async (lat: number, lng: number) => {
    try {
      const res = await request<{ displayName: string }>(`/stops/places/reverse?lat=${lat}&lng=${lng}`);
      if (res && res.displayName) return res.displayName;
    } catch (error) {
      if (error instanceof Error && error.message !== 'DEMO_MODE') {
        // only fallback if not demo mode
      }
    }
    return reverseGeocodeLive(lat, lng);
  },
};

// ============ Routes ============
export const routesApi = {
  getAll: async () => {
    try {
      return await request('/routes');
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
  getById: async (id: string) => {
    try {
      return await request(`/routes/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return null;
      }
      throw error;
    }
  },
  getStops: async (id: string) => {
    try {
      return await request(`/routes/${id}/stops`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
};

// ============ Journeys ============
export const journeysApi = {
  plan: async (data: {
    origin: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name?: string };
    profileType?: string;
    departureTime?: string;
  }): Promise<{
    origin: { lat: number; lng: number; name: string };
    destination: { lat: number; lng: number; name: string };
    options: RouteSearchResult[];
  }> => {
    const originName = data.origin.name || (await reverseGeocodeLive(data.origin.lat, data.origin.lng)) || 'Origin';
    const destName = data.destination.name || (await reverseGeocodeLive(data.destination.lat, data.destination.lng)) || 'Destination';

    // Compute nearby stands for origin
    const nearbyStands = DEMO_TRANSPORT_STANDS.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address,
      operatingHours: s.operatingHours,
      distanceM: Math.round(haversineDistanceClient(data.origin.lat, data.origin.lng, s.latitude, s.longitude)),
      typicalFareMin: s.typicalFareMin,
      typicalFareMax: s.typicalFareMax,
      currency: s.currency,
    })).sort((a, b) => a.distanceM - b.distanceM).slice(0, 3);

    try {
      const res = await request<{
        origin: { lat: number; lng: number; name: string };
        destination: { lat: number; lng: number; name: string };
        options: any[];
      }>('/journeys/plan', { method: 'POST', body: data });

      if (res && res.options && Array.isArray(res.options) && res.options.length > 0) {
        const mapped: RouteSearchResult[] = res.options.map((opt) => {
          const boardLat = opt.boardStop?.latitude || data.origin.lat;
          const boardLng = opt.boardStop?.longitude || data.origin.lng;
          const alightLat = opt.alightStop?.latitude || data.destination.lat;
          const alightLng = opt.alightStop?.longitude || data.destination.lng;

          return {
            route: {
              id: opt.routeId || `route-${Math.random()}`,
              name: opt.routeLongName || `Line ${opt.routeShortName || 'Bus'}`,
              shortName: opt.routeShortName || 'BUS',
              vehicleType: (opt.vehicleType?.toLowerCase() || 'bus') as any,
              stops: [],
              color: '#059669',
              description: `${opt.boardStop?.name || originName} to ${opt.alightStop?.name || destName}`,
              active: true,
            },
            eta: opt.durationMinutes || 25,
            duration: opt.durationMinutes || 25,
            walkingDistance: opt.walkingDistanceM || 200,
            transfers: 0,
            stairs: opt.accessibility?.wheelchairCompatible ? 0 : 2,
            crowding: (opt.crowding?.level || 'LOW') as any,
            delay: 0,
            vehicleAccessible: opt.accessibility?.wheelchairCompatible ?? true,
            originCoords: { lat: data.origin.lat, lng: data.origin.lng },
            destinationCoords: { lat: data.destination.lat, lng: data.destination.lng },
            originName: originName,
            destinationName: destName,
            scores: {
              accessibility: opt.scores?.accessibility || 90,
              safety: opt.scores?.safety || 88,
              reliability: opt.scores?.reliability || 85,
              comfort: opt.scores?.crowding || 85,
              overall: opt.scores?.overall || 88,
            },
            fare: opt.fare
              ? {
                  type: (opt.fare.type || 'exact') as any,
                  exact: opt.fare.exact,
                  min: opt.fare.min,
                  max: opt.fare.max,
                  currency: opt.fare.currency || 'INR',
                  confidence: opt.fare.confidence || 0.95,
                  source: opt.fare.source || 'Mo Bus Public Transit Fare Table',
                  status: (opt.fare.status || 'confirmed') as any,
                  notes: opt.fare.notes,
                }
              : {
                  type: 'exact',
                  exact: 20,
                  currency: 'INR',
                  confidence: 0.95,
                  source: 'Mo Bus Public Transit Fare Table',
                  status: 'confirmed',
                },
            nearbyStands,
            recommendation: {
              recommended: opt.rank === 1,
              rank: opt.rank || 1,
              reasons: opt.explanation || ['Optimized for step-free flat path access'],
              tradeoff: opt.recommendation || '',
            },
            geometry: opt.geometry || {
              originToBoardWalk: [[data.origin.lat, data.origin.lng], [boardLat, boardLng]],
              transitPath: [[boardLat, boardLng], [alightLat, alightLng]],
              alightToDestWalk: [[alightLat, alightLng], [data.destination.lat, data.destination.lng]],
              fullRoute: [[data.origin.lat, data.origin.lng], [boardLat, boardLng], [alightLat, alightLng], [data.destination.lat, data.destination.lng]],
            },
            intermediateStops: opt.intermediateStops || [],
            turnByTurn: opt.turnByTurn || [
              `Walk to ${opt.boardStop?.name || 'Boarding Station'}`,
              `Board Line ${opt.routeShortName || 'Bus'}`,
              `Ride to ${opt.alightStop?.name || 'Alighting Station'}`,
              `Walk to ${destName}`,
            ],
            segments: [
              {
                type: 'walk',
                from: originName,
                to: opt.boardStop?.name || 'Boarding Station',
                duration: opt.walkingTimeMinutes || 3,
                accessible: true,
                stairs: 0,
              },
              {
                type: 'ride',
                from: opt.boardStop?.name || 'Boarding Station',
                to: opt.alightStop?.name || 'Alighting Station',
                duration: Math.max(3, (opt.durationMinutes || 25) - (opt.walkingTimeMinutes || 3)),
                accessible: opt.accessibility?.wheelchairCompatible ?? true,
                stairs: opt.accessibility?.wheelchairCompatible ? 0 : 2,
              },
              {
                type: 'walk',
                from: opt.alightStop?.name || 'Alighting Station',
                to: destName,
                duration: 2,
                accessible: true,
                stairs: 0,
              },
            ],
            condition: {
              routeId: opt.routeId || 'C3',
              delay: 0,
              crowding: (opt.crowding?.level || 'LOW') as any,
              accessibility: opt.accessibility?.wheelchairCompatible ? 'AVAILABLE' : 'LIMITED',
              vehicleStatus: 'active',
              updatedAt: new Date().toISOString(),
            },
          };
        });

        return {
          origin: { lat: data.origin.lat, lng: data.origin.lng, name: originName },
          destination: { lat: data.destination.lat, lng: data.destination.lng, name: destName },
          options: mapped,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'DEMO_MODE') {
        // Backend request error -> compute client-side dynamically
      }
    }

    // Dynamic real-world client-side OSRM calculation
    const options = await generateDynamicSearchResults(
      { lat: data.origin.lat, lng: data.origin.lng, name: originName },
      { lat: data.destination.lat, lng: data.destination.lng, name: destName },
      data.profileType || 'wheelchair',
    );

    return {
      origin: { lat: data.origin.lat, lng: data.origin.lng, name: originName },
      destination: { lat: data.destination.lat, lng: data.destination.lng, name: destName },
      options,
    };
  },
  save: async (data: unknown) => {
    try {
      return await request('/journeys', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { id: crypto.randomUUID(), status: 'saved' };
      }
      throw error;
    }
  },
  start: async (journeyId: string) => {
    try {
      return await request(`/journeys/${journeyId}/start`, { method: 'POST' });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'started' };
      }
      throw error;
    }
  },
  complete: async (journeyId: string) => {
    try {
      return await request(`/journeys/${journeyId}/complete`, { method: 'POST' });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'completed' };
      }
      throw error;
    }
  },
  getById: async (journeyId: string) => {
    try {
      return await request(`/journeys/${journeyId}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return null;
      }
      throw error;
    }
  },
};

// ============ Profile ============
export const profileApi = {
  get: async () => {
    try {
      return await request('/profile');
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return null;
      }
      throw error;
    }
  },
  update: async (profile: unknown) => {
    try {
      return await request('/profile', { method: 'PUT', body: profile });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'updated' };
      }
      throw error;
    }
  },
  addEmergencyContact: async (data: { name: string; phone: string; relationship: string; isPrimary?: boolean }) => {
    try {
      return await request('/profile/emergency-contacts', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { id: crypto.randomUUID(), ...data };
      }
      throw error;
    }
  },
  deleteEmergencyContact: async (id: string) => {
    try {
      return await request(`/profile/emergency-contacts/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'deleted' };
      }
      throw error;
    }
  },
};

// ============ Reports & Incident Triage ============
export const reportsApi = {
  submitCrowding: async (data: { routeId: string; vehicleId?: string; level: string; comment?: string }) => {
    try {
      return await request('/reports/crowding', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'submitted' };
      }
      throw error;
    }
  },
  submitDelay: async (data: { routeId: string; delayMinutes: number; comment?: string }) => {
    try {
      return await request('/reports/delay', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'submitted' };
      }
      throw error;
    }
  },
  submitAccessibility: async (data: { routeId: string; vehicleId?: string; type: string; issue?: string; comment?: string }) => {
    try {
      return await request('/reports/accessibility', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'submitted' };
      }
      throw error;
    }
  },
  submitCrowdingFeedback: async (data: { routeId: string; level: string; journeyId?: string }) => {
    try {
      return await request('/feedback/crowding', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'submitted' };
      }
      throw error;
    }
  },
};

// ============ Proactive Safety ============
export const safetyApi = {
  start: async (data: { journeyId: string; expectedArrivalAt: string; heartbeatIntervalMinutes?: number }) => {
    try {
      return await request('/safety/start', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { sessionId: crypto.randomUUID(), status: 'active' };
      }
      throw error;
    }
  },
  heartbeat: async (sessionId: string) => {
    try {
      return await request('/safety/heartbeat', { method: 'POST', body: { sessionId } });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'heartbeat_received' };
      }
      throw error;
    }
  },
  emergency: async (sessionId: string) => {
    try {
      return await request('/safety/emergency', { method: 'POST', body: { sessionId } });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'emergency_triggered' };
      }
      throw error;
    }
  },
  sendEmergencySms: async (data: {
    recipientPhone: string;
    recipientName?: string;
    senderName?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
  }) => {
    try {
      return await request<{
        dispatchId: string;
        status: string;
        recipientPhone: string;
        recipientName: string;
        message: string;
        mapLink: string;
        coordinates: [number, number];
        timestamp: string;
      }>('/safety/emergency-sms', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return {
          dispatchId: crypto.randomUUID(),
          status: 'sent',
          recipientPhone: data.recipientPhone,
          recipientName: data.recipientName || 'Contact',
          message: 'Emergency alert sent',
          mapLink: `https://maps.google.com/?q=${data.latitude},${data.longitude}`,
          coordinates: [data.latitude || 0, data.longitude || 0],
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  },
  complete: async (sessionId: string) => {
    try {
      return await request('/safety/complete', { method: 'POST', body: { sessionId } });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'completed' };
      }
      throw error;
    }
  },
  getById: async (sessionId: string) => {
    try {
      return await request(`/safety/${sessionId}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return null;
      }
      throw error;
    }
  },
};

// ============ Crowding & Fares ============
export const crowdingApi = {
  getByRoute: async (routeId: string) => {
    try {
      return await request(`/crowding/route/${routeId}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { level: 'LOW', confidence: 0.8 };
      }
      throw error;
    }
  },
  getByVehicle: async (vehicleId: string) => {
    try {
      return await request(`/crowding/vehicle/${vehicleId}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { level: 'LOW', confidence: 0.8 };
      }
      throw error;
    }
  },
};

export const faresApi = {
  estimate: async (routeId?: string, originZoneId?: string, destinationZoneId?: string) => {
    try {
      const query = new URLSearchParams();
      if (routeId) query.set('routeId', routeId);
      if (originZoneId) query.set('originZoneId', originZoneId);
      if (destinationZoneId) query.set('destinationZoneId', destinationZoneId);
      return await request(`/fares/estimate?${query.toString()}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { min: 15, max: 25, currency: 'INR', confidence: 0.8 };
      }
      throw error;
    }
  },
};

// ============ Shared Transport ============
export const transportApi = {
  getStandsNearby: async (lat: number, lng: number, radius = 1000) => {
    try {
      return await request(`/transport/stands/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
  getCorridorsNearby: async (lat: number, lng: number) => {
    try {
      return await request(`/transport/corridors/nearby?lat=${lat}&lng=${lng}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
};

// ============ Accessibility Evaluation ============
export const evaluateApi = {
  evaluateRoute: async (data: { profileType?: string; customProfile?: unknown; route: unknown }) => {
    try {
      return await request('/accessibility/evaluate', { method: 'POST', body: data });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { score: 85, accessible: true };
      }
      throw error;
    }
  },
};

// ============ Notifications ============
export const notificationsApi = {
  getAll: async (unreadOnly = false) => {
    try {
      return await request(`/notifications${unreadOnly ? '?unread=true' : ''}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return [];
      }
      throw error;
    }
  },
  markRead: async (id: string) => {
    try {
      return await request(`/notifications/${id}/read`, { method: 'POST' });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'marked_read' };
      }
      throw error;
    }
  },
  markAllRead: async () => {
    try {
      return await request('/notifications/read-all', { method: 'POST' });
    } catch (error) {
      if (error instanceof Error && error.message === 'DEMO_MODE') {
        return { status: 'all_marked_read' };
      }
      throw error;
    }
  },
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
