import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapPin, Navigation, ArrowRight, Clock, Bus, Car,
  ShieldCheck, ChevronRight, Search, Sparkles, Crosshair,
  TrendingUp, Zap, Shield, Globe
} from 'lucide-react';
import { DEMO_STOPS, DEMO_TRANSPORT_STANDS } from '../../data/mock';
import { useUserLocation } from '../../hooks/useUserLocation';
import { LocationRegionBanner } from '../../components/LocationRegionBanner';
import { SavedPlacesBar } from '../../components/SavedPlacesBar';

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

const stopPin = createHomePin('#2563eb', '🚏');
const taxiPin = createHomePin('#d97706', '🚖');
const userGpsPin = createHomePin('#10b981', '📍');

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { currentUser, activeJourney } = state;
  const { userLocation, isLocating, requestLocation } = useUserLocation();

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 font-sans">
      {/* Top Welcome Header & City Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
              🇮🇳 Pan-India Navigation & Mobility
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {greeting}, {currentUser?.name || 'Passenger'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Safer, Smarter & Inclusive Accessible National Transit
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <LocationRegionBanner compact />
          <Link to="/plan">
            <Button size="sm" className="shadow-sm">
              <Navigation className="w-3.5 h-3.5 mr-1.5" /> Book a Ride
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Search Bar Card (Google Maps / Rapido / Uber Style "Where to?") */}
      <div
        onClick={() => navigate('/plan')}
        className="bg-white border border-neutral-200 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-black transition-all cursor-pointer group flex items-center justify-between"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-colors shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-black text-neutral-900 group-hover:text-black block truncate">
              Where to?
            </span>
            <span className="text-xs text-neutral-500 block truncate mt-0.5">
              Enter destination for step-free routes, live metro, buses & auto stands
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-100 group-hover:bg-black group-hover:text-white px-3.5 py-2 rounded-xl transition-all shrink-0 ml-2">
          <span>Search</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Saved Places Fast 1-Tap Bar (Home / Work) & Commuter Pass */}
      <SavedPlacesBar
        onSelectPlace={(place) => navigate(`/plan?to=${encodeURIComponent(place.address)}`)}
      />

      {/* Active Navigation Card (If journey in progress) */}
      {activeJourney && (
        <div className="bg-black text-white p-5 rounded-3xl border border-neutral-800 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping absolute opacity-40" />
              <span className="w-3 h-3 rounded-full bg-white relative" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-black text-neutral-400 tracking-wider">
                  Live Ride in Progress
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800">
                  Active
                </span>
              </div>
              <span className="text-base font-black text-white block truncate">
                {activeJourney.routeName} → {activeJourney.destinationName}
              </span>
            </div>
          </div>
          <Link to={`/journey/${activeJourney.id}`} className="shrink-0">
            <button
              type="button"
              className="px-4 py-2.5 bg-white hover:bg-neutral-100 text-black font-black rounded-2xl text-xs flex items-center gap-1.5 shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span>Start Live Navigation</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </Link>
        </div>
      )}

      {/* Everyday Indian Mobility Services Grid (Rapido, Auto, Cab, Metro, Bus, Walking) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
            Official Travel & Commute Modes
          </span>
          <span className="text-[11px] font-semibold text-neutral-500">
            Compare live fares & availability
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Service 1: Bike Taxi (Rapido / Moto) */}
          <div
            onClick={() => navigate('/plan?mobility=bike')}
            className="p-4 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xl">
                🛵
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                Rapido & Moto
              </span>
            </div>
            <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
              Bike Taxi (Rapido / Moto)
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              Fastest solo commute navigating city traffic.
            </span>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-[11px]">
              <span className="font-extrabold text-amber-700">From ₹25 (₹8.5/km)</span>
              <span className="font-bold text-neutral-400 group-hover:text-black flex items-center gap-0.5">
                Book ➔
              </span>
            </div>
          </div>

          {/* Service 2: Auto Rickshaw (Rapido / Namma Yatri) */}
          <div
            onClick={() => navigate('/plan?mobility=auto')}
            className="p-4 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-700 flex items-center justify-center font-bold text-xl">
                🛺
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-200">
                Meter & App
              </span>
            </div>
            <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
              Auto Rickshaw
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              Metered & app auto (Rapido / Namma Yatri).
            </span>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-[11px]">
              <span className="font-extrabold text-yellow-800">From ₹30 (₹15/km)</span>
              <span className="font-bold text-neutral-400 group-hover:text-black flex items-center gap-0.5">
                Book ➔
              </span>
            </div>
          </div>

          {/* Service 3: Cabs & Taxis (Uber / Ola) */}
          <div
            onClick={() => navigate('/plan?mobility=cab')}
            className="p-4 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold text-xl">
                🚖
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                Uber & Ola
              </span>
            </div>
            <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
              Cabs & Taxis (Uber / Ola)
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              AC Cabs (Mini, Sedan, XL) with direct dispatch.
            </span>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-[11px]">
              <span className="font-extrabold text-neutral-900">From ₹90</span>
              <span className="font-bold text-neutral-400 group-hover:text-black flex items-center gap-0.5">
                Book ➔
              </span>
            </div>
          </div>

          {/* Service 4: Metro Rail Transit */}
          <div
            onClick={() => navigate('/plan?mobility=metro')}
            className="p-4 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl">
                🚇
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                Fast & AC
              </span>
            </div>
            <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
              Metro Rail Transit
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              Fastest urban transit across major metro lines.
            </span>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-[11px]">
              <span className="font-extrabold text-indigo-700">From ₹10 - ₹60</span>
              <span className="font-bold text-neutral-400 group-hover:text-black flex items-center gap-0.5">
                Explore ➔
              </span>
            </div>
          </div>

          {/* Service 5: Accessible Public Buses */}
          <div
            onClick={() => navigate('/plan?mobility=bus')}
            className="p-4 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl">
                🚌
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                ♿ Ramp Bus
              </span>
            </div>
            <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
              Public Bus Transit
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              Low-floor electric buses with wheelchair ramp.
            </span>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-[11px]">
              <span className="font-extrabold text-blue-700">From ₹10 - ₹25</span>
              <span className="font-bold text-neutral-400 group-hover:text-black flex items-center gap-0.5">
                Routes ➔
              </span>
            </div>
          </div>

          {/* Service 6: Step-Free Safe Walking */}
          <div
            onClick={() => navigate('/plan?mobility=walking')}
            className="p-4 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl">
                🛡️
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                Zero-Step
              </span>
            </div>
            <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
              Safe Corridor Walk
            </span>
            <span className="text-xs text-neutral-500 block mt-0.5">
              Illuminated step-free sidewalks & ramps.
            </span>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 text-[11px]">
              <span className="font-extrabold text-emerald-700">100% Free</span>
              <span className="font-bold text-neutral-400 group-hover:text-black flex items-center gap-0.5">
                Map ➔
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Pan-India Interactive Mini Map */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-800">
              Live Map: {userLocation.cityName || userLocation.regionLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => requestLocation()}
              disabled={isLocating}
              className="text-[11px] font-bold text-neutral-700 hover:text-black bg-neutral-100 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Detecting GPS...' : 'Use My Current Location'}</span>
            </button>
          </div>
        </div>

        <div className="h-[280px] sm:h-[320px] w-full rounded-2xl overflow-hidden border border-neutral-200 relative z-0 isolate">
          <MapContainer
            key={`${userLocation.lat}-${userLocation.lng}`}
            center={[userLocation.lat, userLocation.lng]}
            zoom={14}
            scrollWheelZoom={false}
            attributionControl={false}
            className="w-full h-full"
            style={{ zIndex: 1 }}
          >
            <TileLayer
              url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['0', '1', '2', '3']}
              maxZoom={20}
            />

            {/* User GPS Pin */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userGpsPin}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="block font-bold text-emerald-800">📍 Your Location</strong>
                  <span className="text-neutral-600 block mt-0.5">
                    {userLocation.placeName || userLocation.cityName}
                  </span>
                </div>
              </Popup>
            </Marker>

            {/* Public Bus Stops & Stands */}
            {DEMO_STOPS.slice(0, 6).map((stop) => (
              <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopPin}>
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="block font-bold text-blue-900">🚏 {stop.name}</strong>
                    <span className="text-neutral-600 block mt-0.5">
                      {stop.hasRamp ? '♿ Ramp Certified' : 'Standard Access'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Shared Taxi / Auto Stands */}
            {DEMO_TRANSPORT_STANDS.slice(0, 4).map((stand) => (
              <Marker key={stand.id} position={[stand.latitude, stand.longitude]} icon={taxiPin}>
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="block font-bold text-amber-900">🚖 {stand.name}</strong>
                    <span className="text-neutral-600 block mt-0.5">
                      Typical Fare: ₹{stand.typicalFareMin} - ₹{stand.typicalFareMax}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
