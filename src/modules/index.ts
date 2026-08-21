// ============================================
// Module Adapter Architecture for ACCESS
// ============================================
// Each module exposes a Provider interface with mock + real implementations.
// This allows acquired modules to replace mock implementations without
// rewriting the application.

import type { CrowdingLevel, SafetySession, Notification, Report } from '../types';

// ============ Safety Check-in Provider ============
export interface SafetyCheckInProvider {
  startSession(journeyId: string): Promise<SafetySession>;
  heartbeat(sessionId: string): Promise<SafetySession>;
  triggerEmergency(sessionId: string): Promise<SafetySession>;
  completeSession(sessionId: string): Promise<SafetySession>;
  getSession(journeyId: string): Promise<SafetySession | null>;
}

export class MockSafetyCheckInProvider implements SafetyCheckInProvider {
  async startSession(journeyId: string): Promise<SafetySession> {
    return {
      id: `safety-${Date.now()}`, journeyId, status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      lastCheckIn: new Date().toISOString(),
      nextCheckInDue: new Date(Date.now() + 10 * 60000).toISOString(),
      checkInIntervalMinutes: 10, emergencyContactNotified: false,
    };
  }
  async heartbeat(sessionId: string): Promise<SafetySession> {
    return {
      id: sessionId, journeyId: '', status: 'SAFE',
      startedAt: '', lastCheckIn: new Date().toISOString(),
      nextCheckInDue: new Date(Date.now() + 10 * 60000).toISOString(),
      checkInIntervalMinutes: 10, emergencyContactNotified: false,
    };
  }
  async triggerEmergency(sessionId: string): Promise<SafetySession> {
    return {
      id: sessionId, journeyId: '', status: 'EMERGENCY',
      startedAt: '', checkInIntervalMinutes: 10, emergencyContactNotified: true,
    };
  }
  async completeSession(sessionId: string): Promise<SafetySession> {
    return {
      id: sessionId, journeyId: '', status: 'COMPLETED',
      startedAt: '', checkInIntervalMinutes: 10, emergencyContactNotified: false,
    };
  }
  async getSession(): Promise<SafetySession | null> { return null; }
}

// ============ Accessibility Evaluation Provider ============
export interface AccessibilityEvaluationProvider {
  evaluateRoute(profile: unknown, route: unknown): Promise<{
    score: number; factors: string[]; recommendation: string;
  }>;
}

export class MockAccessibilityEvaluationProvider implements AccessibilityEvaluationProvider {
  async evaluateRoute(): Promise<{ score: number; factors: string[]; recommendation: string }> {
    return {
      score: 92,
      factors: ['No stairs', 'Accessible vehicle', 'Low crowding', 'Short walking distance'],
      recommendation: 'This route is highly suitable for your accessibility profile.',
    };
  }
}

// ============ Reporting Provider ============
export interface ReportingProvider {
  submitReport(report: Omit<Report, 'id' | 'timestamp' | 'status'>): Promise<Report>;
  getReports(routeId?: string): Promise<Report[]>;
}

export class MockReportingProvider implements ReportingProvider {
  async submitReport(report: Omit<Report, 'id' | 'timestamp' | 'status'>): Promise<Report> {
    return {
      ...report, id: `rpt-${Date.now()}`,
      timestamp: new Date().toISOString(), status: 'NEW',
    };
  }
  async getReports(): Promise<Report[]> { return []; }
}

// ============ Map Provider ============
export interface MapProvider {
  readonly name: string;
  readonly type: 'core' | 'acquired';
  getTileUrl(): string;
  getAttribution(): string;
}

export class OpenStreetMapProvider implements MapProvider {
  name = 'OpenStreetMap';
  type = 'core' as const;
  getTileUrl() { return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; }
  getAttribution() { return '&copy; OpenStreetMap contributors'; }
}

// ============ Crowding Provider ============
export interface CrowdingProvider {
  predict(routeId: string): Promise<{
    predicted: CrowdingLevel; confidence: number; estimatedLevel: string;
  }>;
}

export class MockCrowdingProvider implements CrowdingProvider {
  async predict(routeId: string) {
    return { predicted: 'LOW' as CrowdingLevel, confidence: 0.75, estimatedLevel: 'Low crowding expected' };
  }
}

// Placeholder for acquired implementation
// export class AcquiredCrowdingProvider implements CrowdingProvider { ... }

// ============ Notification Provider ============
export interface NotificationProvider {
  subscribe(callback: (notification: Notification) => void): () => void;
  send(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<void>;
}

export class MockNotificationProvider implements NotificationProvider {
  private listeners: ((n: Notification) => void)[] = [];
  subscribe(callback: (n: Notification) => void) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }
  async send(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const full: Notification = {
      ...notification, id: `notif-${Date.now()}`, timestamp: new Date().toISOString(),
    };
    this.listeners.forEach(l => l(full));
  }
}

// ============ Voice Provider ============
export interface VoiceProvider {
  speak(text: string): Promise<void>;
  listen(): Promise<string>;
  readonly available: boolean;
}

export class MockVoiceProvider implements VoiceProvider {
  available = false;
  async speak() { /* placeholder */ }
  async listen() { return ''; }
}

// ============ Offline Provider ============
export interface OfflineProvider {
  downloadRoute(routeId: string): Promise<void>;
  downloadStops(stopIds: string[]): Promise<void>;
  getDownloadedRoutes(): Promise<string[]>;
  getLastUpdated(): Promise<string | null>;
}

export class MockOfflineProvider implements OfflineProvider {
  async downloadRoute() { /* placeholder */ }
  async downloadStops() { /* placeholder */ }
  async getDownloadedRoutes() { return []; }
  async getLastUpdated() { return null; }
}

// ============ Module Registry ============
export const modules = {
  safety: new MockSafetyCheckInProvider() as SafetyCheckInProvider,
  accessibility: new MockAccessibilityEvaluationProvider() as AccessibilityEvaluationProvider,
  reporting: new MockReportingProvider() as ReportingProvider,
  map: new OpenStreetMapProvider() as MapProvider,
  crowding: new MockCrowdingProvider() as CrowdingProvider,
  notifications: new MockNotificationProvider() as NotificationProvider,
  voice: new MockVoiceProvider() as VoiceProvider,
  offline: new MockOfflineProvider() as OfflineProvider,
};
