import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { useToast } from './store/ToastContext';
import { ToastItem } from './components/ui';
import { PassengerLayout, OperatorLayout } from './components/layouts';
import { DEMO_USER, DEMO_CONDITIONS, DEMO_NOTIFICATIONS, DEMO_JOURNEY_HISTORY } from './data/mock';

// Lazy-load pages for performance
const LandingPage = lazy(() => import('./pages/passenger/LandingPage'));
const HomePage = lazy(() => import('./pages/passenger/HomePage'));
const ProfilePage = lazy(() => import('./pages/passenger/ProfilePage'));
const TripPlannerPage = lazy(() => import('./pages/passenger/TripPlannerPage'));
const RouteDiscoveryPage = lazy(() => import('./pages/passenger/RouteDiscoveryPage'));
const ActiveJourneyPage = lazy(() => import('./pages/passenger/ActiveJourneyPage'));
const JourneyHistoryPage = lazy(() => import('./pages/passenger/JourneyHistoryPage'));
const NotificationsPage = lazy(() => import('./pages/passenger/NotificationsPage'));

const OperatorDashboard = lazy(() => import('./pages/operator/OperatorDashboard'));
const OperatorRoutesPage = lazy(() => import('./pages/operator/OperatorRoutesPage'));
const OperatorVehiclesPage = lazy(() => import('./pages/operator/OperatorVehiclesPage'));
const OperatorReportsPage = lazy(() => import('./pages/operator/OperatorReportsPage'));
const OperatorConditionsPage = lazy(() => import('./pages/operator/OperatorConditionsPage'));

const ModuleMarketplacePage = lazy(() => import('./pages/modules/ModuleMarketplacePage'));
const ModuleDetailPage = lazy(() => import('./pages/modules/ModuleDetailPage'));

const DemoControlCenter = lazy(() => import('./pages/demo/DemoControlCenter'));
const DemoPitchPage = lazy(() => import('./pages/demo/DemoPitchPage'));
const DemoScenarioPages = lazy(() => import('./pages/demo/DemoScenarioPages').then(m => ({ default: m.WheelchairDemo })));
const LiveDelayDemo = lazy(() => import('./pages/demo/DemoScenarioPages').then(m => ({ default: m.LiveDelayDemo })));
const CrowdingDemo = lazy(() => import('./pages/demo/DemoScenarioPages').then(m => ({ default: m.CrowdingDemo })));
const SafetyDemo = lazy(() => import('./pages/demo/DemoScenarioPages').then(m => ({ default: m.SafetyDemo })));
const ReportingDemo = lazy(() => import('./pages/demo/DemoScenarioPages').then(m => ({ default: m.ReportingDemo })));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-navy-200 border-t-navy-900 rounded-full animate-spin" />
        <span className="text-sm text-navy-500">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  const { state, setUser, setJourneyHistory } = useAppStore();
  const { toasts, removeToast } = useToast();

  // Initialize demo data
  useEffect(() => {
    if (state.demoMode && !state.currentUser) {
      setUser(DEMO_USER);
      setJourneyHistory(DEMO_JOURNEY_HISTORY);
    }
  }, [state.demoMode, state.currentUser, setUser, setJourneyHistory]);

  // Listen for offline status
  useEffect(() => {
    const handleOnline = () => {
      // Could dispatch an action here
    };
    const handleOffline = () => {
      // Could dispatch an action here
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Passenger Routes */}
          <Route element={<PassengerLayout />}>
            <Route path="/app" element={<HomePage />} />
            <Route path="/plan" element={<TripPlannerPage />} />
            <Route path="/routes" element={<RouteDiscoveryPage />} />
            <Route path="/journeys" element={<JourneyHistoryPage />} />
            <Route path="/journey/:id" element={<ActiveJourneyPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Operator Routes */}
          <Route element={<OperatorLayout />}>
            <Route path="/operator" element={<OperatorDashboard />} />
            <Route path="/operator/routes" element={<OperatorRoutesPage />} />
            <Route path="/operator/vehicles" element={<OperatorVehiclesPage />} />
            <Route path="/operator/reports" element={<OperatorReportsPage />} />
            <Route path="/operator/conditions" element={<OperatorConditionsPage />} />
            <Route path="/operator/alerts" element={<OperatorDashboard />} />
          </Route>

          {/* Module Routes */}
          <Route element={<PassengerLayout />}>
            <Route path="/modules" element={<ModuleMarketplacePage />} />
            <Route path="/modules/:moduleId" element={<ModuleDetailPage />} />
          </Route>

          {/* Demo Routes */}
          <Route element={<PassengerLayout />}>
            <Route path="/demo" element={<DemoControlCenter />} />
            <Route path="/demo/pitch" element={<DemoPitchPage />} />
            <Route path="/demo/wheelchair" element={<DemoScenarioPages />} />
            <Route path="/demo/live-delay" element={<LiveDelayDemo />} />
            <Route path="/demo/crowding" element={<CrowdingDemo />} />
            <Route path="/demo/safety" element={<SafetyDemo />} />
            <Route path="/demo/reporting" element={<ReportingDemo />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* Global Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2" aria-live="polite" aria-label="Notifications">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
