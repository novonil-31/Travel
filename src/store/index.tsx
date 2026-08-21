import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  User, AccessibilityProfile, Journey, RouteSearchResult,
  TransportCondition, Notification, Report, SafetySession,
  CrowdingLevel, AccessibilityStatus, VehicleStatusType,
  AccessibilitySettings, SafetyStatus, JourneyStatus,
} from '../types';

// ---- State Shape ----
export interface AppState {
  currentUser: User | null;
  accessibilityProfile: AccessibilityProfile;
  activeJourney: Journey | null;
  routes: RouteSearchResult[];
  searchResults: RouteSearchResult[];
  transportConditions: Record<string, TransportCondition>;
  notifications: Notification[];
  reports: Report[];
  operatorAlerts: Notification[];
  journeyHistory: Journey[];
  demoMode: boolean;
  isOffline: boolean;
  accessibilitySettings: AccessibilitySettings;
}

const defaultProfile: AccessibilityProfile = {
  mobility: 'wheelchair',
  stairs: 'avoid',
  walkingTolerance: 'low',
  crowding: 'avoid',
  vision: 'normal',
  hearing: 'normal',
  safetyPreferences: ['late-night', 'prefer-safer'],
};

const initialState: AppState = {
  currentUser: null,
  accessibilityProfile: defaultProfile,
  activeJourney: null,
  routes: [],
  searchResults: [],
  transportConditions: {},
  notifications: [],
  reports: [],
  operatorAlerts: [],
  journeyHistory: [],
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  isOffline: false,
  accessibilitySettings: {
    largerText: false,
    highContrast: false,
    reducedMotion: false,
  },
};

// ---- Actions ----
type Action =
  | { type: 'SET_USER'; user: User }
  | { type: 'UPDATE_PROFILE'; profile: Partial<AccessibilityProfile> }
  | { type: 'SET_ACTIVE_JOURNEY'; journey: Journey | null }
  | { type: 'UPDATE_JOURNEY'; updates: Partial<Journey> }
  | { type: 'COMPLETE_JOURNEY' }
  | { type: 'SET_SEARCH_RESULTS'; results: RouteSearchResult[] }
  | { type: 'UPDATE_CONDITION'; routeId: string; condition: Partial<TransportCondition> }
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'ADD_REPORT'; report: Report }
  | { type: 'UPDATE_REPORT_STATUS'; id: string; status: Report['status'] }
  | { type: 'UPDATE_SAFETY_SESSION'; session: Partial<SafetySession> }
  | { type: 'SET_DEMO_MODE'; enabled: boolean }
  | { type: 'SET_OFFLINE'; offline: boolean }
  | { type: 'SET_ACCESSIBILITY_SETTINGS'; settings: Partial<AccessibilitySettings> }
  | { type: 'RESET_DEMO' }
  | { type: 'SET_JOURNEY_HISTORY'; history: Journey[] }
  | { type: 'ADD_JOURNEY_TO_HISTORY'; journey: Journey }
  | { type: 'SET_OPERATOR_ALERTS'; alerts: Notification[] }
  | { type: 'ADD_OPERATOR_ALERT'; alert: Notification }
  | { type: 'RECOMPUTE_ROUTES' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.user };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        accessibilityProfile: { ...state.accessibilityProfile, ...action.profile },
        currentUser: state.currentUser
          ? { ...state.currentUser, profile: { ...state.currentUser.profile, ...action.profile } }
          : state.currentUser,
      };

    case 'SET_ACTIVE_JOURNEY':
      return { ...state, activeJourney: action.journey };

    case 'UPDATE_JOURNEY':
      if (!state.activeJourney) return state;
      return { ...state, activeJourney: { ...state.activeJourney, ...action.updates } };

    case 'COMPLETE_JOURNEY': {
      if (!state.activeJourney) return state;
      const completed: Journey = {
        ...state.activeJourney,
        status: 'completed' as JourneyStatus,
        completedAt: new Date().toISOString(),
      };
      return {
        ...state,
        activeJourney: completed,
        journeyHistory: [completed, ...state.journeyHistory],
      };
    }

    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.results };

    case 'UPDATE_CONDITION': {
      const existing = state.transportConditions[action.routeId] || {
        routeId: action.routeId,
        delay: 0,
        crowding: 'LOW' as CrowdingLevel,
        accessibility: 'AVAILABLE' as AccessibilityStatus,
        vehicleStatus: 'active' as VehicleStatusType,
        updatedAt: new Date().toISOString(),
      };
      const updated = {
        ...existing,
        ...action.condition,
        updatedAt: new Date().toISOString(),
      };
      // Also update search results if they exist
      const updatedResults = state.searchResults.map(r => {
        if (r.route.id === action.routeId) {
          const newCrowding = action.condition.crowding || r.crowding;
          const newDelay = action.condition.delay !== undefined ? action.condition.delay : r.delay;
          // Recompute scores based on new conditions
          const crowdingPenalty = newCrowding === 'HIGH' ? 25 : newCrowding === 'MEDIUM' ? 10 : 0;
          const delayPenalty = Math.min(newDelay * 2, 20);
          const accessPenalty = action.condition.accessibility === 'UNAVAILABLE' ? 30 : action.condition.accessibility === 'LIMITED' ? 15 : 0;
          return {
            ...r,
            crowding: newCrowding,
            delay: newDelay,
            condition: updated,
            scores: {
              ...r.scores,
              accessibility: Math.max(0, r.scores.accessibility - accessPenalty),
              comfort: Math.max(0, 90 - crowdingPenalty),
              reliability: Math.max(0, 90 - delayPenalty),
              safety: r.scores.safety,
              overall: Math.max(0, Math.round((r.scores.accessibility - accessPenalty + r.scores.safety + 90 - delayPenalty + 90 - crowdingPenalty) / 4)),
            },
            recommendation: {
              ...r.recommendation,
              recommended: false,
            },
          };
        }
        return r;
      });
      // Re-rank by overall score
      const sorted = [...updatedResults].sort((a, b) => b.scores.overall - a.scores.overall);
      sorted.forEach((r, i) => {
        r.recommendation = { ...r.recommendation, rank: i + 1, recommended: i === 0 };
      });
      if (sorted.length > 0 && sorted[0].recommendation.recommended) {
        sorted[0].recommendation.reasons = generateReasons(sorted[0]);
      }
      return {
        ...state,
        transportConditions: { ...state.transportConditions, [action.routeId]: updated },
        searchResults: sorted,
      };
    }

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.notification, ...state.notifications] };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    case 'ADD_REPORT':
      return { ...state, reports: [action.report, ...state.reports] };

    case 'UPDATE_REPORT_STATUS':
      return {
        ...state,
        reports: state.reports.map(r =>
          r.id === action.id ? { ...r, status: action.status } : r
        ),
      };

    case 'UPDATE_SAFETY_SESSION': {
      if (!state.activeJourney?.safetySession) return state;
      return {
        ...state,
        activeJourney: {
          ...state.activeJourney,
          safetySession: { ...state.activeJourney.safetySession, ...action.session },
        },
      };
    }

    case 'SET_DEMO_MODE':
      return { ...state, demoMode: action.enabled };

    case 'SET_OFFLINE':
      return { ...state, isOffline: action.offline };

    case 'SET_ACCESSIBILITY_SETTINGS':
      return {
        ...state,
        accessibilitySettings: { ...state.accessibilitySettings, ...action.settings },
      };

    case 'SET_JOURNEY_HISTORY':
      return { ...state, journeyHistory: action.history };

    case 'ADD_JOURNEY_TO_HISTORY':
      return { ...state, journeyHistory: [action.journey, ...state.journeyHistory] };

    case 'SET_OPERATOR_ALERTS':
      return { ...state, operatorAlerts: action.alerts };

    case 'ADD_OPERATOR_ALERT':
      return { ...state, operatorAlerts: [action.alert, ...state.operatorAlerts] };

    case 'RECOMPUTE_ROUTES': {
      const recomputed = [...state.searchResults].sort((a, b) => b.scores.overall - a.scores.overall);
      recomputed.forEach((r, i) => {
        r.recommendation = { ...r.recommendation, rank: i + 1, recommended: i === 0 };
      });
      return { ...state, searchResults: recomputed };
    }

    case 'RESET_DEMO':
      return { ...initialState, demoMode: true };

    default:
      return state;
  }
}

function generateReasons(result: RouteSearchResult): string[] {
  const reasons: string[] = [];
  if (result.stairs === 0) reasons.push('No stairs on this route');
  if (result.vehicleAccessible) reasons.push('Accessible vehicle available');
  if (result.crowding === 'LOW') reasons.push('Low crowding expected');
  if (result.walkingDistance <= 400) reasons.push('Short walking distance');
  if (result.scores.safety >= 85) reasons.push('High safety rating');
  if (result.delay === 0) reasons.push('No current delays');
  if (result.transfers <= 1) reasons.push('Minimal transfers');
  return reasons.length > 0 ? reasons : ['Best overall match for your profile'];
}

// ---- Context ----
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience actions
  updateProfile: (profile: Partial<AccessibilityProfile>) => void;
  setActiveJourney: (journey: Journey | null) => void;
  updateJourney: (updates: Partial<Journey>) => void;
  completeJourney: () => void;
  setSearchResults: (results: RouteSearchResult[]) => void;
  updateCondition: (routeId: string, condition: Partial<TransportCondition>) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  addReport: (report: Report) => void;
  updateReportStatus: (id: string, status: Report['status']) => void;
  updateSafetySession: (session: Partial<SafetySession>) => void;
  setDemoMode: (enabled: boolean) => void;
  resetDemo: () => void;
  triggerEvent: (event: { type: string; [key: string]: unknown }) => void;
  startJourney: (routeResult: RouteSearchResult) => void;
  setUser: (user: User) => void;
  setJourneyHistory: (history: Journey[]) => void;
  setAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const updateProfile = useCallback((profile: Partial<AccessibilityProfile>) => {
    dispatch({ type: 'UPDATE_PROFILE', profile });
  }, []);

  const setActiveJourney = useCallback((journey: Journey | null) => {
    dispatch({ type: 'SET_ACTIVE_JOURNEY', journey });
  }, []);

  const updateJourney = useCallback((updates: Partial<Journey>) => {
    dispatch({ type: 'UPDATE_JOURNEY', updates });
  }, []);

  const completeJourney = useCallback(() => {
    dispatch({ type: 'COMPLETE_JOURNEY' });
  }, []);

  const setSearchResults = useCallback((results: RouteSearchResult[]) => {
    dispatch({ type: 'SET_SEARCH_RESULTS', results });
  }, []);

  const updateCondition = useCallback((routeId: string, condition: Partial<TransportCondition>) => {
    dispatch({ type: 'UPDATE_CONDITION', routeId, condition });
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    dispatch({ type: 'ADD_NOTIFICATION', notification });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', id });
  }, []);

  const addReport = useCallback((report: Report) => {
    dispatch({ type: 'ADD_REPORT', report });
  }, []);

  const updateReportStatus = useCallback((id: string, status: Report['status']) => {
    dispatch({ type: 'UPDATE_REPORT_STATUS', id, status });
  }, []);

  const updateSafetySession = useCallback((session: Partial<SafetySession>) => {
    dispatch({ type: 'UPDATE_SAFETY_SESSION', session });
  }, []);

  const setDemoMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_DEMO_MODE', enabled });
  }, []);

  const resetDemo = useCallback(() => {
    dispatch({ type: 'RESET_DEMO' });
  }, []);

  const setUser = useCallback((user: User) => {
    dispatch({ type: 'SET_USER', user });
  }, []);

  const setJourneyHistory = useCallback((history: Journey[]) => {
    dispatch({ type: 'SET_JOURNEY_HISTORY', history });
  }, []);

  const setAccessibilitySettings = useCallback((settings: Partial<AccessibilitySettings>) => {
    dispatch({ type: 'SET_ACCESSIBILITY_SETTINGS', settings });
  }, []);

  const triggerEvent = useCallback((event: { type: string; [key: string]: unknown }) => {
    // Process live events and dispatch appropriate actions
    switch (event.type) {
      case 'ROUTE_DELAY_UPDATED':
        dispatch({
          type: 'UPDATE_CONDITION',
          routeId: event.routeId as string,
          condition: { delay: event.delay as number },
        });
        break;
      case 'CROWDING_UPDATED':
        dispatch({
          type: 'UPDATE_CONDITION',
          routeId: event.routeId as string,
          condition: { crowding: event.crowding as CrowdingLevel },
        });
        break;
      default:
        break;
    }
  }, []);

  const startJourney = useCallback((routeResult: RouteSearchResult) => {
    const journey: Journey = {
      id: `journey-${Date.now()}`,
      userId: state.currentUser?.id || 'demo-user',
      originId: routeResult.segments[0]?.fromId || 'origin',
      destinationId: routeResult.segments[routeResult.segments.length - 1]?.toId || 'dest',
      originName: routeResult.segments[0]?.from || 'Origin',
      destinationName: routeResult.segments[routeResult.segments.length - 1]?.to || 'Destination',
      routeId: routeResult.route.id,
      routeName: routeResult.route.name,
      status: 'active',
      startedAt: new Date().toISOString(),
      eta: new Date(Date.now() + routeResult.duration * 60000).toISOString(),
      duration: routeResult.duration,
      segments: routeResult.segments,
      scores: routeResult.scores,
      currentSegmentIndex: 0,
      currentStopId: routeResult.segments[0]?.fromId,
      delay: routeResult.delay,
      crowding: routeResult.crowding,
      safetySession: {
        id: `safety-${Date.now()}`,
        journeyId: `journey-${Date.now()}`,
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        lastCheckIn: new Date().toISOString(),
        nextCheckInDue: new Date(Date.now() + 10 * 60000).toISOString(),
        checkInIntervalMinutes: 10,
        emergencyContactNotified: false,
      },
    };
    dispatch({ type: 'SET_ACTIVE_JOURNEY', journey });
  }, [state.currentUser]);

  const value: AppContextValue = {
    state,
    dispatch,
    updateProfile,
    setActiveJourney,
    updateJourney,
    completeJourney,
    setSearchResults,
    updateCondition,
    addNotification,
    markNotificationRead,
    addReport,
    updateReportStatus,
    updateSafetySession,
    setDemoMode,
    resetDemo,
    triggerEvent,
    startJourney,
    setUser,
    setJourneyHistory,
    setAccessibilitySettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
