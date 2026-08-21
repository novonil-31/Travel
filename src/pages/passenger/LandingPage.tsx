import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Clock, Shield, Accessibility, Users, ArrowRight, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { generateDemoSearchResults, DEMO_STOPS } from '../../data/mock';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function LandingPage() {
  const navigate = useNavigate();
  const { setSearchResults, updateProfile } = useAppStore();

  const [pickup, setPickup] = useState('Campus Gate');
  const [dropoff, setDropoff] = useState('Patia');
  const [timeMode, setTimeMode] = useState('now');
  const [mobilityFilter, setMobilityFilter] = useState<'wheelchair' | 'walking' | 'senior' | 'all'>('wheelchair');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;
    
    // Calibrate profile
    if (mobilityFilter === 'wheelchair') {
      updateProfile({ mobility: 'wheelchair', stairs: 'avoid', walkingTolerance: 'low' });
    } else if (mobilityFilter === 'senior') {
      updateProfile({ mobility: 'elderly', stairs: 'avoid', walkingTolerance: 'low' });
    }

    const results = generateDemoSearchResults(pickup, dropoff);
    setSearchResults(results);
    navigate('/routes');
  };

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145], // Campus Gate
    [20.3570, 85.8170], // Hospital
    [20.3530, 85.8160], // KIIT Square
    [20.3450, 85.8180], // Patia
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      {/* Uber-style Clean Top Navbar */}
      <header className="bg-black text-white px-6 sm:px-12 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Maarg Darshan Logo"
              className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain shadow-sm"
            />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Maarg Darshan
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <Link to="/plan" className="text-white hover:text-neutral-300">Plan Trip</Link>
            <Link to="/routes" className="text-neutral-300 hover:text-white">Routes</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-xs font-bold text-neutral-300 hover:text-white px-3 py-2">
            Guest Mode
          </Link>
          <Link to="/login" className="bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-full text-xs font-bold transition-all">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section: Uber-Style Split (Left Card + Right Live Map) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Search Card (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-uber-elevated space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
                Go anywhere with barrier-free transit.
              </h1>
              <p className="text-sm text-neutral-600 mt-2">
                Real-time accessibility scores, wheelchair ramp confirmation, and zero unexpected stairs.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-3.5">
              {/* Pickup Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Pickup Location</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-600 pointer-events-none ring-2 ring-emerald-200" />
                  <input
                    type="text"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="Enter pickup address, campus, or station..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Drop-off Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Drop-off Destination</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 bg-black pointer-events-none rounded-sm" />
                  <input
                    type="text"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    placeholder="Enter destination or transit hub..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Mobility Profile & Schedule Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Schedule</label>
                  <select
                    value={timeMode}
                    onChange={(e) => setTimeMode(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-neutral-100 border border-transparent focus:border-black text-xs font-semibold text-neutral-900 focus:outline-none cursor-pointer"
                  >
                    <option value="now">🕒 Leave Now</option>
                    <option value="depart">Depart at...</option>
                    <option value="arrive">Arrive by...</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Mobility Mode</label>
                  <select
                    value={mobilityFilter}
                    onChange={(e) => setMobilityFilter(e.target.value as any)}
                    className="w-full px-3 py-3 rounded-xl bg-neutral-100 border border-transparent focus:border-black text-xs font-semibold text-neutral-900 focus:outline-none cursor-pointer"
                  >
                    <option value="wheelchair">♿ Wheelchair</option>
                    <option value="senior">👵 Senior</option>
                    <option value="walking">🦯 Walking Aid</option>
                    <option value="all">🚶 Standard</option>
                  </select>
                </div>
              </div>

              {/* Uber Black CTA Button */}
              <button
                type="submit"
                className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black text-base rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
              >
                <SearchIcon />
                <span>Search Accessible Routes</span>
              </button>
            </form>

            {/* Quick Presets */}
            <div className="pt-4 border-t border-neutral-100 space-y-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Popular routes in Bhubaneswar:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { from: 'Campus Gate', to: 'Patia' },
                  { from: 'Hospital', to: 'Jaydev Vihar' },
                  { from: 'Infocity', to: 'Campus 25' },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setPickup(p.from); setDropoff(p.to); }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800 transition-colors"
                  >
                    {p.from} → {p.to}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Map Frame (7 Cols) */}
          <div className="lg:col-span-7 h-[460px] lg:h-[560px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-uber-elevated relative">
            <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={false} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline positions={polylineCoords} color="#000000" weight={5} opacity={0.8} />

              {DEMO_STOPS.map(stop => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                  <Popup>
                    <div className="p-1">
                      <strong className="text-sm font-bold block">{stop.name}</strong>
                      <span className="text-xs text-neutral-600 block">
                        {stop.accessible ? '♿ Accessible Ramp & Flat Terrain' : 'Standard Stop'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <Marker position={[20.3530, 85.8160]}>
                <Popup>
                  <div className="p-1">
                    <strong className="text-sm text-emerald-700 block">🚌 Low-Floor Bus C3-01</strong>
                    <span className="text-xs">Ramp Active • On Time</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Map Floating Overlay Badge */}
            <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-neutral-200 px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2 text-xs font-bold text-neutral-900">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Campus Telemetry Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Rapido / Uber Style Services Grid */}
      <section className="bg-neutral-50 py-16 px-6 sm:px-12 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto space-y-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Our Transit Accessibility Services
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              Purpose-built navigation engineered for passengers with diverse mobility requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                <Accessibility className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Step-Free Journey Routing</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Guarantees zero unexpected stairs, verified operating elevators, and low-floor electric ramp buses.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Proactive Safety Watchdog</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Automated check-in heartbeat monitors your transit journey and notifies your designated emergency contacts if delayed.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Real-Time Vehicle Crowding</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Live sensor occupancy metrics warn you before boarding crowded compartments so you can travel comfortably.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="bg-black text-white py-12 px-6 sm:px-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Maarg Darshan Logo"
              className="w-6 h-6 rounded-md bg-white p-0.5 object-contain"
            />
            <span className="font-black text-white text-base">Maarg Darshan</span>
            <span>• Accessible Public Transit Network</span>
          </div>
          <div>© {new Date().getFullYear()} Maarg Darshan (मार्ग Darshan). All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
