import type { AccessModule } from '../types';

export const DEMO_MODULES: AccessModule[] = [
  {
    id: 'safety-checkin',
    name: 'Safety Check-in API',
    icon: 'Shield',
    description: 'Provides proactive safety checks for vulnerable users during their journey.',
    type: 'core',
    status: 'CONNECTED',
    version: '1.2.0',
    provider: 'ACCESS System',
    complexity: 'HIGH',
    endpoints: [
      { method: 'POST', path: '/checkin/start', description: 'Start a safety session for a journey' },
      { method: 'POST', path: '/checkin/heartbeat', description: 'Record user heartbeat response' },
      { method: 'POST', path: '/checkin/emergency', description: 'Trigger emergency protocol' },
      { method: 'POST', path: '/checkin/complete', description: 'End safety session' },
      { method: 'GET', path: '/checkin/{journey_id}', description: 'Get session status' }
    ]
  },
  {
    id: 'accessibility-eval',
    name: 'Accessibility Evaluation Engine',
    icon: 'Accessibility',
    description: 'Calculates personalized route accessibility scores based on user profiles.',
    type: 'core',
    status: 'CONNECTED',
    version: '2.0.1',
    provider: 'ACCESS System',
    complexity: 'HIGH',
    endpoints: [
      { method: 'POST', path: '/evaluate/route', description: 'Calculate score for route' },
      { method: 'GET', path: '/profile/templates', description: 'Get standard profile templates' },
      { method: 'GET', path: '/factors/{route_id}', description: 'Get detailed factor breakdown' }
    ]
  },
  {
    id: 'condition-reporting',
    name: 'Transport Condition Reporting',
    icon: 'Users',
    description: 'Crowdsourced reporting and live monitoring of transport conditions.',
    type: 'core',
    status: 'CONNECTED',
    version: '1.0.5',
    provider: 'ACCESS System',
    complexity: 'MEDIUM',
    endpoints: [
      { method: 'POST', path: '/report/crowding', description: 'Submit crowding report' },
      { method: 'POST', path: '/report/delay', description: 'Submit delay report' },
      { method: 'POST', path: '/report/accessibility', description: 'Submit accessibility report' },
      { method: 'GET', path: '/route/{route_id}/conditions', description: 'Get current conditions' }
    ]
  },
  {
    id: 'advanced-map',
    name: 'Advanced Map',
    icon: 'Map',
    description: 'High-detail indoor mapping and navigation for transport hubs.',
    type: 'available',
    status: 'AVAILABLE',
    complexity: 'HIGH'
  },
  {
    id: 'crowding-prediction',
    name: 'Crowding Prediction',
    icon: 'Activity',
    description: 'ML-based prediction of future crowding based on historical data.',
    type: 'available',
    status: 'AVAILABLE',
    complexity: 'HIGH'
  },
  {
    id: 'notification-infra',
    name: 'Notification Infrastructure',
    icon: 'Bell',
    description: 'Scalable push notification delivery system across multiple channels.',
    type: 'available',
    status: 'AVAILABLE',
    complexity: 'MEDIUM'
  },
  {
    id: 'voice-accessibility',
    name: 'Voice Accessibility',
    icon: 'Mic',
    description: 'Voice interface for all core features of the platform.',
    type: 'available',
    status: 'AVAILABLE',
    complexity: 'HIGH'
  },
  {
    id: 'offline-data',
    name: 'Offline Data Pack',
    icon: 'Database',
    description: 'Pre-downloads network data for low-connectivity environments.',
    type: 'available',
    status: 'AVAILABLE',
    complexity: 'MEDIUM'
  }
];
