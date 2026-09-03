import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Clock, Shield, Accessibility, Users, ArrowRight, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { DEMO_STOPS, DEMO_TRANSPORT_STANDS } from '../../data/mock';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-hero-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 28px;
        height: 28px;
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
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const busPin = createMapPin('#2563eb', '🚏');
const taxiPin = createMapPin('#d97706', '🚖');

import { stopsApi } from '../../api';
import type { GeocodedPlace } from '../../utils/onlineRouting';
import { getLastSearchedDestination, saveRecentSearch } from '../../utils/recentSearches';
import { isLoggedInAccount } from '../../utils/authUtils';
import { useUserLocation } from '../../hooks/useUserLocation';
import { LocationRegionBanner } from '../../components/LocationRegionBanner';

export default function LandingPage() {
  const navigate = useNavigate();
  const { state, updateProfile } = useAppStore();
  const { userLocation } = useUserLocation();

  const isAuth = isLoggedInAccount(state.currentUser);
  const lastSavedSearch = isAuth && state.currentUser ? getLastSearchedDestination(state.currentUser.id) : null;

  const [pickup, setPickup] = useState("Queen's Castle 1 (QC 1)");
  const [dropoff, setDropoff] = useState(isAuth && lastSavedSearch?.destination?.name ? lastSavedSearch.destination.name : 'Campus 3 OAT');
  const [pickupLocation, setPickupLocation] = useState<{ name: string; lat: number; lng: number }>({
    name: "Queen's Castle 1 (QC 1)",
    lat: 20.352367250329067,
    lng: 85.81937388473358,
  });
  const [dropoffLocation, setDropoffLocation] = useState<{ name: string; lat: number; lng: number }>({
    name: isAuth && lastSavedSearch?.destination?.name ? lastSavedSearch.destination.name : 'Campus 3 OAT',
    lat: isAuth && lastSavedSearch?.destination?.lat ? lastSavedSearch.destination.lat : 20.352708891788033,
    lng: isAuth && lastSavedSearch?.destination?.lng ? lastSavedSearch.destination.lng : 85.81637927996144,
  });

  const [activeDropdown, setActiveDropdown] = useState<'pickup' | 'dropoff' | null>(null);
  const searchFormRef = useRef<HTMLDivElement>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<GeocodedPlace[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<GeocodedPlace[]>([]);

  const [timeMode, setTimeMode] = useState('now');
  const [departTime, setDepartTime] = useState('');
  const [mobilityFilter, setMobilityFilter] = useState<'wheelchair' | 'walking' | 'senior' | 'all'>('all');

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search for Pickup with active userLocation
  React.useEffect(() => {
    const query = pickup?.trim() || '';
    const timeout = setTimeout(async () => {
      try {
        const places = await stopsApi.searchPlaces(query, userLocation);
        setPickupSuggestions(places);
      } catch (err) {
        console.error('Pickup search error:', err);
      }
    }, query.length === 0 ? 0 : 200);
    return () => clearTimeout(timeout);
  }, [pickup, userLocation]);

  // Debounced search for Drop-off with active userLocation
  React.useEffect(() => {
    const query = dropoff?.trim() || '';
    const timeout = setTimeout(async () => {
      try {
        const places = await stopsApi.searchPlaces(query, userLocation);
        setDropoffSuggestions(places);
      } catch (err) {
        console.error('Dropoff search error:', err);
      }
    }, query.length === 0 ? 0 : 200);
    return () => clearTimeout(timeout);
  }, [dropoff, userLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;
    
    // Calibrate profile
    if (mobilityFilter === 'wheelchair') {
      updateProfile({ mobility: 'wheelchair', stairs: 'avoid', walkingTolerance: 'low' });
    } else if (mobilityFilter === 'senior') {
      updateProfile({ mobility: 'elderly', stairs: 'avoid', walkingTolerance: 'low' });
    } else if (mobilityFilter === 'walking') {
      updateProfile({ mobility: 'walking-difficulty', stairs: 'avoid', walkingTolerance: 'low' });
    } else {
      updateProfile({ mobility: 'none', stairs: 'acceptable', walkingTolerance: 'high' });
    }

    // Save recent search for authentic logged-in user
    if (isAuth && state.currentUser) {
      saveRecentSearch(state.currentUser.id, pickupLocation, dropoffLocation);
    }

    const timeParam = timeMode !== 'now' && departTime ? `&departTime=${encodeURIComponent(departTime)}` : '';
    const query = `origin=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(dropoff)}&originLat=${pickupLocation.lat}&originLng=${pickupLocation.lng}&destLat=${dropoffLocation.lat}&destLng=${dropoffLocation.lng}&mobility=${mobilityFilter}&timeMode=${timeMode}${timeParam}`;

    if (!isAuth) {
      navigate(`/login?${query}`);
    } else {
      navigate(`/plan?${query}`);
    }
  };

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145], // Campus Gate
    [20.3570, 85.8170], // Hospital
    [20.3530, 85.8160], // KIIT Square
    [20.3450, 85.8180], // Patia
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      {/* Clean Top Navbar */}
      <header className="bg-black text-white px-6 sm:px-12 h-16 flex items-center justify-between sticky top-0 z-[1100] shadow-md">
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

      {/* Hero Section: Split (Left Card + Right Live Map) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Search Card (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-uber-elevated space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
                Go anywhere with barrier-free transit.
              </h1>
              <p className="text-sm text-neutral-600 mt-2">
                Maybe it's time to take the road not taken.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Search Region</span>
              <LocationRegionBanner compact />
            </div>

            <form onSubmit={handleSearch} className="space-y-3.5">
              <div ref={searchFormRef} className="space-y-3.5">
                {/* Pickup Input */}
                <div className="space-y-1 relative">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Pickup Location</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-600 pointer-events-none ring-2 ring-emerald-200" />
                    <input
                      type="text"
                      value={pickup}
                      onFocus={() => setActiveDropdown('pickup')}
                      onChange={(e) => {
                        setPickup(e.target.value);
                        setActiveDropdown('pickup');
                      }}
                      placeholder="Enter pickup address, campus, or station..."
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Pickup Dropdown */}
                  {activeDropdown === 'pickup' && pickupSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-neutral-100">
                      <div className="px-3 py-1 bg-neutral-50 text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center justify-between border-b border-neutral-100">
                        <span>Priority in {userLocation.cityName}</span>
                        <span className="text-neutral-400 font-normal">Real-Time Search</span>
                      </div>
                      {pickupSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPickup(place.name);
                            setPickupLocation({ name: place.name, lat: place.lat, lng: place.lng });
                            setActiveDropdown(null);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-start gap-3 transition-colors text-xs font-semibold"
                        >
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-neutral-900 font-bold flex items-center gap-1.5 truncate">
                              <span>{place.name}</span>
                              {place.distanceLabel && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-600 font-normal ml-auto shrink-0">
                                  {place.distanceLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 line-clamp-1">{place.displayName}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drop-off Input */}
                <div className="space-y-1 relative">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Drop-off Destination</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 bg-black pointer-events-none rounded-sm" />
                    <input
                      type="text"
                      value={dropoff}
                      onFocus={() => setActiveDropdown('dropoff')}
                      onChange={(e) => {
                        setDropoff(e.target.value);
                        setActiveDropdown('dropoff');
                      }}
                      placeholder="Enter destination or transit hub..."
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Dropoff Dropdown */}
                  {activeDropdown === 'dropoff' && dropoffSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-neutral-100">
                      <div className="px-3 py-1 bg-neutral-50 text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center justify-between border-b border-neutral-100">
                        <span>Priority in {userLocation.cityName}</span>
                        <span className="text-neutral-400 font-normal">Real-Time Search</span>
                      </div>
                      {dropoffSuggestions.map((place, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDropoff(place.name);
                            setDropoffLocation({ name: place.name, lat: place.lat, lng: place.lng });
                            setActiveDropdown(null);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-start gap-3 transition-colors text-xs font-semibold"
                        >
                          <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-neutral-900 font-bold flex items-center gap-1.5 truncate">
                              <span>{place.name}</span>
                              {place.distanceLabel && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-600 font-normal ml-auto shrink-0">
                                  {place.distanceLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 line-clamp-1">{place.displayName}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Logged In Last Destination Chip */}
                  {isAuth && lastSavedSearch?.destination && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-[10px] font-bold text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>Recent:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDropoff(lastSavedSearch.destination.name);
                          setDropoffLocation(lastSavedSearch.destination);
                        }}
                        className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer truncate max-w-[240px] border border-neutral-200"
                      >
                        <span>📍 {lastSavedSearch.destination.name}</span>
                      </button>
                    </div>
                  )}
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
                    <option value="now">⚡ Leave Now</option>
                    <option value="depart">⏰ Depart at...</option>
                    <option value="arrive">🏁 Arrive by...</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Mobility Mode</label>
                  <select
                    value={mobilityFilter}
                    onChange={(e) => setMobilityFilter(e.target.value as any)}
                    className="w-full px-3 py-3 rounded-xl bg-neutral-100 border border-transparent focus:border-black text-xs font-semibold text-neutral-900 focus:outline-none cursor-pointer"
                  >
                    <option value="all">🚶 Standard (All Transit)</option>
                    <option value="wheelchair">♿ Wheelchair (Step-Free & Ramps)</option>
                    <option value="senior">👵 Senior Friendly</option>
                    <option value="walking">🦯 Walking Aid</option>
                  </select>
                </div>
              </div>

              {/* Time Input if Depart/Arrive selected */}
              {timeMode !== 'now' && (
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-3 text-xs animate-fadeIn">
                  <span className="font-bold text-neutral-800">Choose Exact Time:</span>
                  <input
                    type="time"
                    value={departTime}
                    onChange={(e) => setDepartTime(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 focus:border-black font-bold text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
              )}

              {/* Search CTA Button */}
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
                  { from: 'Campus Gate', to: 'Patia Transit Station' },
                  { from: 'Hospital', to: 'Jaydev Vihar' },
                  { from: 'Infocity', to: 'Master Canteen' },
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

          {/* Right Live Map Frame (7 Cols) - Isolated Stacking Context */}
          <div className="lg:col-span-7 h-[460px] lg:h-[560px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-uber-elevated relative z-0 isolate">
            <MapContainer
              center={[20.3530, 85.8160]}
              zoom={14}
              scrollWheelZoom={false}
              className="w-full h-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polyline positions={polylineCoords} color="#2563eb" weight={5} opacity={0.9} />

              {DEMO_STOPS.map(stop => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={busPin}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong className="text-sm font-bold block text-blue-900">🚏 {stop.name}</strong>
                      <span className="text-neutral-600 block mt-0.5">
                        {stop.accessible ? '♿ Accessible Ramp & Flat Terrain' : 'Standard Bus Stop'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {DEMO_TRANSPORT_STANDS.slice(0, 3).map(stand => (
                <Marker key={stand.id} position={[stand.latitude, stand.longitude]} icon={taxiPin}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong className="text-sm font-bold block text-amber-900">🚖 {stand.name}</strong>
                      <span className="text-neutral-600 block mt-0.5">Typical Fare: ₹{stand.typicalFareMin} - ₹{stand.typicalFareMax}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Floating Overlay Badge */}
            <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-neutral-200 px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2 text-xs font-bold text-neutral-900">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Transit Telemetry Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Value Pillars */}
      <section className="bg-neutral-50 py-16 px-6 sm:px-12 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Built for dignified, independent mobility
            </h2>
            <p className="text-sm text-neutral-600">
              Every route calculation is evaluated across multiple real-world accessibility and safety vectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                ♿
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Wheelchair & Step-Free</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Prioritizes low-floor ramp-certified buses, operational station elevators, and flat curb ramps.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Quiet Safety Watchdog</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Continuous GPS tracking, well-lit corridors for late hours, and automated safe arrival alerts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">
                👥
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
