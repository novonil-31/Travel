import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button, Badge } from '../../components/ui';
import { DEMO_STOPS, DEMO_CONDITIONS, generateDemoSearchResults, DEMO_USER } from '../../data/mock';
import {
  Navigation, MapPin, ArrowRight, ShieldCheck, Accessibility,
  Compass, Clock, Activity, ChevronRight, Bus, CheckCircle,
  Users, Layers, ArrowDownUp, Sparkles, Shield, HeartPulse,
  Maximize2, Eye, Sliders
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function LandingPage() {
  const navigate = useNavigate();
  const { setSearchResults, updateProfile, setUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'ride' | 'bus' | 'specialized'>('ride');
  const [origin, setOrigin] = useState('Campus Gate');
  const [destination, setDestination] = useState('Patia');
  const [mobilityProfile, setMobilityProfile] = useState<'wheelchair' | 'senior' | 'walking'>('wheelchair');
  const [mapLayer, setMapLayer] = useState<'all' | 'accessible' | 'buses'>('all');
  const [isSearching, setIsSearching] = useState(false);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setIsSearching(true);

    updateProfile({
      mobility: mobilityProfile === 'wheelchair' ? 'wheelchair' : mobilityProfile === 'senior' ? 'elderly' : 'walking-difficulty',
      stairs: mobilityProfile === 'wheelchair' ? 'avoid' : 'avoid',
      walkingTolerance: mobilityProfile === 'wheelchair' ? 'low' : 'low',
      crowding: 'avoid',
      vision: 'normal',
      hearing: 'normal',
      safetyPreferences: ['late-night', 'prefer-safer'],
    });

    setTimeout(() => {
      const results = generateDemoSearchResults(origin, destination);
      setSearchResults(results);
      setIsSearching(false);
      navigate('/routes');
    }, 350);
  };

  const handleQuickPersona = (persona: 'wheelchair' | 'senior' | 'operator') => {
    if (persona === 'operator') {
      navigate('/operator');
      return;
    }
    setUser({
      ...DEMO_USER,
      name: persona === 'wheelchair' ? 'Aarav (Wheelchair)' : 'Meera (Senior)',
      email: persona === 'wheelchair' ? 'aarav@access.org' : 'meera@access.org',
    });
    updateProfile({
      mobility: persona === 'wheelchair' ? 'wheelchair' : 'elderly',
      stairs: 'avoid',
      walkingTolerance: 'low',
      crowding: 'avoid',
      vision: 'normal',
      hearing: 'normal',
      safetyPreferences: ['late-night', 'prefer-safer'],
    });
    navigate('/app');
  };

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145], // Campus Gate
    [20.3570, 85.8170], // Hospital
    [20.3530, 85.8160], // KIIT Square
    [20.3450, 85.8180], // Patia
  ];

  return (
    <div className="space-y-16 py-6 sm:py-10 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* 1. UBER HERO SPLIT: Left Interactive Ride Card + Right Live Leaflet Map */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Uber Ride Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 p-6 sm:p-8 rounded-3xl shadow-uber-elevated flex flex-col justify-between">
          <div className="space-y-5">
            {/* Service Mode Tabs */}
            <div className="flex gap-2 pb-2 border-b border-neutral-100">
              <button
                type="button"
                onClick={() => setActiveTab('ride')}
                className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                  activeTab === 'ride' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
                }`}
              >
                ♿ Accessible Ride
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bus')}
                className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                  activeTab === 'bus' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
                }`}
              >
                🚌 Low-Floor Bus
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('specialized')}
                className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                  activeTab === 'specialized' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'
                }`}
              >
                🛡️ Assisted Transit
              </button>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
                Go anywhere, barrier-free
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Zero stairs, verified electric ramps, and real-time safety tracking.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-3.5">
              {/* Pickup Location */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Pickup location
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black pointer-events-none" />
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                  >
                    {DEMO_STOPS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} {s.accessible ? '♿ Accessible' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                    Drop-off destination
                  </label>
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="text-[11px] font-bold text-neutral-500 hover:text-black flex items-center gap-1"
                  >
                    <ArrowDownUp className="w-3 h-3" /> Swap
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 bg-black pointer-events-none" />
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                  >
                    {DEMO_STOPS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} {s.accessible ? '♿ Accessible' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobility Requirement */}
              <div className="space-y-1 pt-1">
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Rider Accessibility Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'wheelchair', label: '♿ Wheelchair' },
                    { id: 'senior', label: '👵 Senior' },
                    { id: 'walking', label: '🦯 Walking Aid' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMobilityProfile(m.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                        mobilityProfile === m.id
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 border-transparent hover:bg-neutral-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <Button type="submit" size="lg" className="w-full py-3.5 text-base font-bold mt-1" loading={isSearching}>
                Search Accessible Routes
              </Button>
            </form>
          </div>

          {/* Quick Presets */}
          <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span className="font-bold">Frequent trips:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setOrigin('Campus Gate'); setDestination('Patia'); }}
                className="font-bold text-black hover:underline"
              >
                Campus → Patia
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setOrigin('Hospital'); setDestination('Jaydev Vihar'); }}
                className="font-bold text-black hover:underline"
              >
                Hospital → Jaydev
              </button>
            </div>
          </div>
        </div>

        {/* Right Clean Uber Map (7 Cols) - Interactive on Homepage! */}
        <div className="lg:col-span-7 bg-neutral-100 border border-neutral-200 rounded-3xl overflow-hidden min-h-[480px] flex flex-col justify-between shadow-sm relative">
          {/* Map Top Filter Header */}
          <div className="bg-white border-b border-neutral-200 px-5 py-3 flex items-center justify-between z-20 relative">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-neutral-900">Bhubaneswar Live Transit Radar</span>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Stops' },
                { id: 'accessible', label: '♿ Accessible' },
                { id: 'buses', label: '🚌 Live Buses' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMapLayer(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapLayer === tab.id
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 w-full h-[400px] relative z-10">
            <MapContainer
              center={[20.3530, 85.8160]}
              zoom={14}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={polylineCoords} color="#000000" weight={5} opacity={0.85} />

              {DEMO_STOPS.map((stop) => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                  <Popup>
                    <div className="p-1 font-sans">
                      <strong className="text-neutral-900 text-sm font-bold block">{stop.name}</strong>
                      <span className="text-xs text-neutral-600 block">
                        {stop.accessible ? '♿ Electric Ramp & Tactile Paving' : 'Standard Stop'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <Marker position={[20.3530, 85.8160]}>
                <Popup>
                  <div className="p-1 font-sans">
                    <strong className="text-neutral-900 text-sm font-bold block">🚌 Low-Floor Bus C3-01</strong>
                    <span className="text-xs text-neutral-600 block">Electric Ramp • Low Crowding</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Map Bottom HUD Link */}
          <div className="bg-white border-t border-neutral-200 px-5 py-3 flex items-center justify-between text-xs z-20 relative">
            <span className="text-neutral-500 font-medium">Click on any station or vehicle for accessibility specs</span>
            <Link to="/app" className="font-bold text-black hover:underline flex items-center gap-1">
              Open Full-Screen HUD →
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SUGGESTIONS & QUICK ACTIONS (Uber Style Grid) */}
      <section className="space-y-4">
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
          Explore Platform Capabilities
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/plan"
            className="p-6 rounded-2xl bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-black transition-all group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-lg group-hover:underline">Trip Planner</h3>
              <p className="text-xs text-neutral-500 mt-1">Multi-criteria routing tailored to your wheelchair or mobility aid.</p>
            </div>
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1">
              Find Routes <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            to="/app"
            className="p-6 rounded-2xl bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-black transition-all group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-lg group-hover:underline">Live Radar HUD</h3>
              <p className="text-xs text-neutral-500 mt-1">Real-time bus tracking, compartment crowding, and arrival times.</p>
            </div>
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1">
              Open HUD <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            to="/operator"
            className="p-6 rounded-2xl bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-black transition-all group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-lg group-hover:underline">Operator Fleet Portal</h3>
              <p className="text-xs text-neutral-500 mt-1">Manage accessible dispatch, delay schedules, and incident reports.</p>
            </div>
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1">
              Manage Fleet <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            to="/modules"
            className="p-6 rounded-2xl bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-black transition-all group flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-lg group-hover:underline">Transit Marketplace</h3>
              <p className="text-xs text-neutral-500 mt-1">Modular extensions: Audio Guidance, SOS Dispatch, and OSRM Engines.</p>
            </div>
            <span className="text-xs font-bold text-neutral-900 flex items-center gap-1">
              View Modules <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* 3. POPULAR ACCESSIBLE CORRIDORS */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
            Live Accessible Corridors
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Active public transit routes with verified step-free boarding in Bhubaneswar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg text-neutral-900">Route C3</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ● Low Crowding
              </span>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900">Campus Gate ↔ Patia Station</h4>
              <p className="text-xs text-neutral-500 mt-0.5">4 Accessible Stops • 0 Stairs • Electric Ramp Bus</p>
            </div>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-semibold">Every 12 mins</span>
              <button
                onClick={() => { setOrigin('Campus Gate'); setDestination('Patia'); }}
                className="font-bold text-black hover:underline"
              >
                Plan this trip →
              </button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg text-neutral-900">Route C5</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ● On Time
              </span>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900">Infocity ↔ KIMS Hospital</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Direct Medical Corridor • Wheelchair Priority Seating</p>
            </div>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-semibold">Every 15 mins</span>
              <button
                onClick={() => { setOrigin('Hospital'); setDestination('Jaydev Vihar'); }}
                className="font-bold text-black hover:underline"
              >
                Plan this trip →
              </button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg text-neutral-900">Route C2</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                +4m Delay
              </span>
            </div>
            <div>
              <h4 className="font-bold text-neutral-900">Master Canteen ↔ Jaydev Vihar</h4>
              <p className="text-xs text-neutral-500 mt-0.5">High Frequency • Tactile Paving at Stations</p>
            </div>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-semibold">Every 8 mins</span>
              <button
                onClick={() => { setOrigin('Campus Gate'); setDestination('Patia'); }}
                className="font-bold text-black hover:underline"
              >
                Plan this trip →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 1-CLICK INSTANT PERSONAS */}
      <section className="bg-neutral-50 border border-neutral-200 p-8 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-black text-neutral-900">1-Click Instant Persona Test</h3>
            <p className="text-xs text-neutral-500">Test the entire app from the perspective of different accessibility profiles.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleQuickPersona('wheelchair')}
            className="p-4 rounded-2xl bg-white hover:bg-neutral-100 border border-neutral-200 text-left transition-all group flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl">♿</span>
            <div>
              <span className="font-bold text-neutral-900 block group-hover:underline">Aarav (Wheelchair)</span>
              <span className="text-xs text-neutral-500 block">Strict step-free & electric ramp only</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickPersona('senior')}
            className="p-4 rounded-2xl bg-white hover:bg-neutral-100 border border-neutral-200 text-left transition-all group flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl">👵</span>
            <div>
              <span className="font-bold text-neutral-900 block group-hover:underline">Meera (Senior)</span>
              <span className="text-xs text-neutral-500 block">Minimal walking distance & low crowding</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickPersona('operator')}
            className="p-4 rounded-2xl bg-white hover:bg-neutral-100 border border-neutral-200 text-left transition-all group flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl">🛡️</span>
            <div>
              <span className="font-bold text-neutral-900 block group-hover:underline">Operator Dispatch</span>
              <span className="text-xs text-neutral-500 block">Fleet telemetry & condition control</span>
            </div>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 pt-12 pb-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        <div>ACCESS • Accessible Public Transit Network</div>
        <div className="flex items-center gap-4 font-semibold">
          <Link to="/plan" className="hover:text-black">Trip Planner</Link>
          <span>•</span>
          <Link to="/app" className="hover:text-black">Live Radar</Link>
          <span>•</span>
          <Link to="/operator" className="hover:text-black">Operator Portal</Link>
          <span>•</span>
          <Link to="/login" className="hover:text-black">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
