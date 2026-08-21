import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge } from '../../components/ui';
import {
  ProfileBadges, SafetyStatusBadge, DelayBadge, CrowdingIndicator,
  VehicleAccessibilityBadge, LastUpdated
} from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapPin, Navigation, ArrowRight, Clock, AlertTriangle, Bus,
  Shield, HeartPulse, ChevronRight, Compass, Search, Filter,
  Sparkles, Footprints
} from 'lucide-react';
import { DEMO_CONDITIONS, DEMO_STOPS, DEMO_VEHICLES } from '../../data/mock';
import { stopsApi } from '../../api';

// Custom Map Pins
const createHomePin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-home-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      ">
        ${label}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const stopPin = createHomePin('#2563eb', '🚏');
const busPin = createHomePin('#000000', '🚌');

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { currentUser, accessibilityProfile, activeJourney } = state;

  const [viewMode, setViewMode] = useState<'dashboard' | 'map'>('dashboard');
  const [mapFilter, setMapFilter] = useState<'all' | 'accessible' | 'buses'>('all');
  const [stopsList, setStopsList] = useState(DEMO_STOPS);

  useEffect(() => {
    stopsApi.getNearby(20.3530, 85.8160, 5000).then((stops: any) => {
      if (stops && stops.length > 0) {
        setStopsList(
          stops.map((s: any) => ({
            id: s.id,
            name: s.name,
            lat: s.latitude || s.lat,
            lng: s.longitude || s.lng,
            accessible: s.accessibility?.hasRamp || s.accessible,
            hasRamp: s.accessibility?.hasRamp || s.hasRamp,
            hasStairs: s.hasStairs,
            hasLighting: s.hasLighting,
            sheltered: s.sheltered,
            routes: s.routes || ['C3'],
          }))
        );
      }
    }).catch(() => {});
  }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145], // Campus Gate
    [20.3570, 85.8170], // Hospital
    [20.3530, 85.8160], // KIIT Square
    [20.3450, 85.8180], // Patia
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6 min-h-[85vh]">
      {/* Top Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Transit Network Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {greeting}, {currentUser?.name || 'Aarav'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Real-world accessible public transit calibrated to your mobility preferences.
          </p>
        </div>

        {/* View Mode Toggle Pill */}
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'dashboard' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Live Network Map</span>
            </button>
          </div>

          <Link to="/plan">
            <Button size="sm">
              <Navigation className="w-3.5 h-3.5 mr-1" /> Plan Accessible Ride
            </Button>
          </Link>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {/* Active Profile Bar */}
          {accessibilityProfile && (
            <div className="bg-neutral-50 border border-neutral-200 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto no-scrollbar">
                <div className="w-9 h-9 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shrink-0 font-bold text-sm shadow-sm">
                  ♿
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                    Active Mobility Routing Calibration
                  </span>
                  <ProfileBadges profile={accessibilityProfile} />
                </div>
              </div>
              <Link to="/profile" className="text-xs font-bold text-black underline shrink-0 hover:text-neutral-600">
                Tune Preferences →
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
                  <Card className="p-6 border-l-4 border-l-black shadow-md rounded-3xl">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                          <span>{activeJourney.originName}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-800" />
                          <span className="font-bold text-neutral-900">{activeJourney.destinationName}</span>
                        </div>
                        <h3 className="text-2xl font-black text-neutral-900">{activeJourney.routeName}</h3>
                      </div>
                      <Badge variant="glow">Live Active</Badge>
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
                  </Card>
                </section>
              )}

              {/* Quick Trip Search Box */}
              <section className="bg-neutral-50 border border-neutral-200 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                    Frequent Step-Free Transit Corridors
                  </span>
                  <Link to="/plan" className="text-xs font-bold text-black underline">
                    Custom Route →
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/plan')}
                    className="p-4 rounded-2xl bg-white border border-neutral-200 text-left hover:border-black transition-all group flex items-center justify-between shadow-sm hover:scale-[1.01]"
                  >
                    <div>
                      <span className="text-xs text-neutral-500 font-medium block">Daily Commute</span>
                      <span className="text-sm font-bold text-neutral-900 group-hover:text-black">
                        Campus Gate → Patia Station
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Line C3 • 0 Stairs • Low-Floor Ramp Bus
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                  </button>

                  <button
                    onClick={() => navigate('/plan')}
                    className="p-4 rounded-2xl bg-white border border-neutral-200 text-left hover:border-black transition-all group flex items-center justify-between shadow-sm hover:scale-[1.01]"
                  >
                    <div>
                      <span className="text-xs text-neutral-500 font-medium block">Medical Corridor</span>
                      <span className="text-sm font-bold text-neutral-900 group-hover:text-black">
                        Hospital → Jaydev Vihar
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Line C5 • Hydraulic Lift • 18m
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                  </button>
                </div>
              </section>
            </div>

            {/* Right Telemetry Column (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">
                Live Transit Telemetry
              </span>
              <Card className="p-0 overflow-hidden divide-y divide-neutral-100 rounded-3xl">
                {Object.entries(state.transportConditions && Object.keys(state.transportConditions).length > 0 ? state.transportConditions : DEMO_CONDITIONS).map(([routeId, cond], i) => (
                  <div key={i} className="p-4 space-y-2 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-neutral-800" />
                        <span className="font-bold text-neutral-900 text-sm">Line {routeId}</span>
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
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* LIVE MAP HUD VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-100 p-4 rounded-3xl border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-600 uppercase mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All Stops' },
                { id: 'accessible', label: '♿ Accessible Only' },
                { id: 'buses', label: '🚌 Live Vehicles' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMapFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    mapFilter === f.id ? 'bg-black text-white shadow-sm' : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button size="sm" variant="secondary" onClick={() => setViewMode('dashboard')}>
              Back to Dashboard
            </Button>
          </div>

          <div className="h-[65vh] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative">
            <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={true} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={polylineCoords} color="#000000" weight={5} opacity={0.8} />

              {stopsList
                .filter((s) => (mapFilter === 'accessible' ? s.accessible : true))
                .map((stop) => (
                  <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopPin}>
                    <Popup>
                      <div className="p-1 text-neutral-900">
                        <strong className="text-sm font-bold block">{stop.name}</strong>
                        <span className="text-xs block text-neutral-600 mb-2">
                          {stop.accessible ? '♿ Certified Ramp & Level Boarding' : 'Standard Stop'}
                        </span>
                        <button
                          onClick={() => navigate('/plan')}
                          className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded-lg w-full"
                        >
                          Plan Ride Here →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {DEMO_VEHICLES.map((v) => (
                <Marker key={v.id} position={[v.lat || 20.3530, v.lng || 85.8160]} icon={busPin}>
                  <Popup>
                    <div className="p-1">
                      <strong className="text-sm text-neutral-900 block">🚌 {v.name}</strong>
                      <span className="text-xs text-neutral-600 block">
                        {v.accessible ? '♿ Wheelchair Ramp Equipped' : 'Standard Vehicle'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
