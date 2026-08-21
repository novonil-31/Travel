// ============================================
// API Client — Centralized API layer for ACCESS
// ============================================
// When VITE_DEMO_MODE=true, all calls return mock data.
// When false, calls go to VITE_API_BASE_URL.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ============ Routes ============
export const routesApi = {
  getAll: () => request('/routes'),
  getById: (id: string) => request(`/routes/${id}`),
  search: (params: { origin: string; destination: string; profile?: unknown }) =>
    request('/routes/search', { method: 'POST', body: params }),
  getConditions: (id: string) => request(`/routes/${id}/conditions`),
};

// ============ Journeys ============
export const journeysApi = {
  start: (data: { routeId: string; origin: string; destination: string }) =>
    request('/journeys/start', { method: 'POST', body: data }),
  complete: (id: string) =>
    request(`/journeys/${id}/complete`, { method: 'POST' }),
  getById: (id: string) => request(`/journeys/${id}`),
};

// ============ Profile ============
export const profileApi = {
  get: () => request('/profile'),
  update: (profile: unknown) => request('/profile', { method: 'PUT', body: profile }),
};

// ============ Reports ============
export const reportsApi = {
  submitCrowding: (data: unknown) => request('/reports/crowding', { method: 'POST', body: data }),
  submitDelay: (data: unknown) => request('/reports/delay', { method: 'POST', body: data }),
  submitAccessibility: (data: unknown) => request('/reports/accessibility', { method: 'POST', body: data }),
};

// ============ Safety ============
export const safetyApi = {
  start: (journeyId: string) => request('/checkin/start', { method: 'POST', body: { journeyId } }),
  heartbeat: (sessionId: string) => request('/checkin/heartbeat', { method: 'POST', body: { sessionId } }),
  emergency: (sessionId: string) => request('/checkin/emergency', { method: 'POST', body: { sessionId } }),
  complete: (sessionId: string) => request('/checkin/complete', { method: 'POST', body: { sessionId } }),
  getStatus: (journeyId: string) => request(`/checkin/${journeyId}`),
};

// ============ Notifications ============
export const notificationsApi = {
  getAll: () => request('/notifications'),
  markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' }),
};

// ============ Operator ============
export const operatorApi = {
  getRoutes: () => request('/operator/routes'),
  updateConditions: (routeId: string, conditions: unknown) =>
    request(`/operator/routes/${routeId}/conditions`, { method: 'PUT', body: conditions }),
};

// ============ Evaluation ============
export const evaluateApi = {
  evaluateRoute: (data: { profile: unknown; route: unknown }) =>
    request('/evaluate/route', { method: 'POST', body: data }),
};

export default {
  routes: routesApi,
  journeys: journeysApi,
  profile: profileApi,
  reports: reportsApi,
  safety: safetyApi,
  notifications: notificationsApi,
  operator: operatorApi,
  evaluate: evaluateApi,
};
