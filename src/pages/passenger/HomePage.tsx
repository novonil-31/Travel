import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge } from '../../components/ui';
import { ProfileBadges, SafetyStatusBadge, DelayBadge, CrowdingIndicator, VehicleAccessibilityBadge, LastUpdated } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapPin, Navigation, ArrowRight, Clock, AlertTriangle, Bus,
  Shield, HeartPulse, ChevronRight, Compass, Search, Filter
} from 'lucide-react';
import { DEMO_CONDITIONS, DEMO_STOPS } from '../../data/mock';

// Leaflet icon setup
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { currentUser, accessibilityProfile, activeJourney } = state;

  const [viewMode, setViewMode] = useState<'dashboard' | 'map'>('dashboard');
  const [mapFilter, setMapFilter] = useState<'all' | 'accessible' | 'buses'>('all');

  // Touch Swipe Gesture Handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0 && viewMode === 'dashboard') {
        setViewMode('map');
      } else if (deltaX > 0 && viewMode === 'map') {
        setViewMode('dashboard');
      }
    }
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145], // Campus Gate
    [20.3570, 85.8170], // Hospital
    [20.3530, 85.8160], // KIIT Square
    [20.3450, 85.8180], // Patia
  ];

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 min-h-[85vh]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-neutral-900 tracking-tight">
            {greeting}, {currentUser?.name || 'Aarav'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
            Accessible public transit calibrated to your mobility settings.
          </p>
        </div>

        {/* View Mode Toggle Pill */}
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'dashboard'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Live Map</span>
            </button>
          </div>

          <Link to="/plan">
            <Button size="sm">
              <Navigation className="w-3.5 h-3.5 mr-1" /> Plan Ride
            </Button>
          </Link>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {/* Active Profile Bar */}
          {accessibilityProfile && (
            <div className="bg-neutral-50 border border-neutral-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto no-scrollbar">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-900 shrink-0 font-bold text-sm">
                  ♿
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                    Accessibility Profile Active
                  </span>
                  <ProfileBadges profile={accessibilityProfile} />
                </div>
              </div>
              <Link to="/profile" className="text-xs font-bold text-black underline shrink-0">
                Edit Settings →
              </Link>
            </div>
          )}

          {/* Grid Layout: Active Trip & Quick Trips */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Active Journey Card */}
              {activeJourney && (
                <section className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                    Active Trip In Progress
                  </span>
                  <div className="bg-white border-2 border-black p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1 font-medium">
                          <span>{activeJourney.originName}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-900" />
                          <span className="font-bold text-neutral-900">{activeJourney.destinationName}</span>
                        </div>
                        <h3 className="text-2xl font-black text-neutral-900">{activeJourney.routeName}</h3>
                      </div>
                      <Badge variant="glow">Live</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-4 my-2 border-y border-neutral-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Arrival Time</span>
                        <span className="text-lg font-black text-neutral-900">
                          {activeJourney.eta ? new Date(activeJourney.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '28 min'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Safety Heartbeat</span>
                        {activeJourney.safetySession && <SafetyStatusBadge status={activeJourney.safetySession.status} />}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Crowding</span>
                        <CrowdingIndicator level={activeJourney.crowding} />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Link to={`/journey/${activeJourney.id}`}>
                        <Button size="sm">
                          Open Turn-by-Turn Navigation <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {/* Quick Trip Search Box (Uber Style) */}
              <section className="bg-neutral-50 border border-neutral-200 p-6 rounded-2xl space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                  Frequent Accessible Routes
                </span>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/plan')}
                    className="p-4 rounded-xl bg-white border border-neutral-200 text-left hover:border-black transition-all group flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <span className="text-xs text-neutral-500 font-medium block">Daily Commute</span>
                      <span className="text-sm font-bold text-neutral-900 group-hover:text-black">Campus Gate → Patia</span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">Route C3 • 0 Stairs • Ramp Bus</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                  </button>

                  <button
                    onClick={() => navigate('/plan')}
                    className="p-4 rounded-xl bg-white border border-neutral-200 text-left hover:border-black transition-all group flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <span className="text-xs text-neutral-500 font-medium block">Medical Corridor</span>
                      <span className="text-sm font-bold text-neutral-900 group-hover:text-black">Infocity → KIMS Hospital</span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">Route C5 • Electric Ramp • 18m</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                  </button>
                </div>
              </section>
            </div>

            {/* Right Telemetry Column (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                Live Vehicle Updates
              </span>
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 shadow-sm">
                {Object.entries(state.transportConditions && Object.keys(state.transportConditions).length > 0 ? state.transportConditions : DEMO_CONDITIONS).map(([routeId, cond], i) => (
                  <div key={i} className="p-4 space-y-2 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-neutral-900" />
                        <span className="font-bold text-neutral-900 text-sm">Route {routeId}</span>
                      </div>
                      <LastUpdated timestamp={cond.updatedAt} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DelayBadge delay={cond.delay} />
                      <CrowdingIndicator level={cond.crowding} />
                      <VehicleAccessibilityBadge status={cond.accessibility} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE MAP HUD VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-100 p-4 rounded-2xl border border-neutral-200">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-neutral-600 uppercase mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All Stops' },
                { id: 'accessible', label: '♿ Accessible Only' },
                { id: 'buses', label: '🚌 Live Buses' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setMapFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                    mapFilter === f.id
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button size="sm" variant="secondary" onClick={() => setViewMode('dashboard')}>
              Return to Dashboard
            </Button>
          </div>

          <div className="h-[65vh] w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-sm relative">
            <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={true} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={polylineCoords} color="#000000" weight={5} opacity={0.8} />

              {DEMO_STOPS.map(stop => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                  <Popup>
                    <div className="p-1 font-sans">
                      <strong className="text-neutral-900 text-sm font-bold block">{stop.name}</strong>
                      <span className="text-xs block text-neutral-600">
                        {stop.accessible ? '♿ Electric Ramp & Elevator' : 'Standard Stop'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <Marker position={[20.3530, 85.8160]}>
                <Popup>
                  <div className="p-1 font-sans">
                    <strong className="text-sm text-neutral-900 font-bold block">🚌 Low-Floor Bus C3-01</strong>
                    <span className="text-xs text-neutral-600 block">Wheelchair Ramp • Low Crowding</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
