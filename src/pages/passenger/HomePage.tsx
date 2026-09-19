import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapPin, Navigation, ArrowRight, Clock, Bus, Car,
  ShieldCheck, ChevronRight, Search, Crosshair,
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
    <div className="max-w-5xl mx-auto px-3.5 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 font-sans">
      {/* Top Welcome Header & City Selector */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 truncate">
            {userLocation.cityName ? `📍 ${userLocation.cityName}` : 'Pan-India Transit'}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight truncate">
            {currentUser?.name ? `${greeting}, ${currentUser.name.split(' ')[0]}` : greeting}
          </h1>
        </div>

        <div className="shrink-0">
          <LocationRegionBanner compact />
        </div>
      </div>

      {/* Main Search Bar Card (Google Maps / Rapido / Uber Style "Where to?") */}
      <div
        onClick={() => navigate('/plan')}
        className="bg-white border border-neutral-200 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-md hover:border-black transition-all cursor-pointer group flex items-center justify-between"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-colors shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-base sm:text-lg font-black text-neutral-900 group-hover:text-black block truncate">
              Where to?
            </span>
            <span className="text-xs text-neutral-500 block truncate">
              Search destination, metro, bus & cab fares
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-neutral-700 bg-neutral-100 group-hover:bg-black group-hover:text-white px-3 py-1.5 rounded-xl transition-all shrink-0 ml-2">
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
        <div className="bg-black text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-800 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider">
                  Live Ride
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-neutral-900 text-emerald-400 border border-neutral-800">
                  Active
                </span>
              </div>
              <span className="text-sm font-black text-white block truncate">
                {activeJourney.routeName} → {activeJourney.destinationName}
              </span>
            </div>
          </div>
          <Link to={`/journey/${activeJourney.id}`} className="shrink-0">
            <button
              type="button"
              className="px-3.5 py-2 bg-white hover:bg-neutral-100 text-black font-black rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <span>Resume</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </Link>
        </div>
      )}

      {/* Commute Modes - Sleek Minimalist 3x2 Grid for Mobile */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-700">
            Commute Modes
          </span>
          <span className="text-[11px] font-semibold text-neutral-400">
            Compare live fares
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {/* Service 1: Bike Taxi */}
          <button
            type="button"
            onClick={() => navigate('/plan?mobility=bike')}
            className="p-2 sm:p-3 rounded-2xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
              🛵
            </div>
            <span className="font-bold text-xs text-neutral-900 mt-1.5 group-hover:text-black truncate w-full px-0.5">
              Bike Taxi
            </span>
            <span className="text-[10px] font-extrabold text-amber-700 mt-0.5 truncate w-full px-0.5">
              From ₹25
            </span>
          </button>

          {/* Service 2: Auto Rickshaw */}
          <button
            type="button"
            onClick={() => navigate('/plan?mobility=auto')}
            className="p-2 sm:p-3 rounded-2xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
              🛺
            </div>
            <span className="font-bold text-xs text-neutral-900 mt-1.5 group-hover:text-black truncate w-full px-0.5">
              Auto
            </span>
            <span className="text-[10px] font-extrabold text-yellow-800 mt-0.5 truncate w-full px-0.5">
              From ₹30
            </span>
          </button>

          {/* Service 3: Cabs & Taxis */}
          <button
            type="button"
            onClick={() => navigate('/plan?mobility=cab')}
            className="p-2 sm:p-3 rounded-2xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
              🚖
            </div>
            <span className="font-bold text-xs text-neutral-900 mt-1.5 group-hover:text-black truncate w-full px-0.5">
              Cab
            </span>
            <span className="text-[10px] font-extrabold text-neutral-900 mt-0.5 truncate w-full px-0.5">
              From ₹90
            </span>
          </button>

          {/* Service 4: Metro Rail */}
          <button
            type="button"
            onClick={() => navigate('/plan?mobility=metro')}
            className="p-2 sm:p-3 rounded-2xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
              🚇
            </div>
            <span className="font-bold text-xs text-neutral-900 mt-1.5 group-hover:text-black truncate w-full px-0.5">
              Metro
            </span>
            <span className="text-[10px] font-extrabold text-indigo-700 mt-0.5 truncate w-full px-0.5">
              From ₹10
            </span>
          </button>

          {/* Service 5: Public Bus Transit */}
          <button
            type="button"
            onClick={() => navigate('/plan?mobility=bus')}
            className="p-2 sm:p-3 rounded-2xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
              🚌
            </div>
            <span className="font-bold text-xs text-neutral-900 mt-1.5 group-hover:text-black truncate w-full px-0.5">
              Bus
            </span>
            <span className="text-[10px] font-extrabold text-blue-700 mt-0.5 truncate w-full px-0.5">
              From ₹10
            </span>
          </button>

          {/* Service 6: Step-Free Safe Walk */}
          <button
            type="button"
            onClick={() => navigate('/plan?mobility=walking')}
            className="p-2 sm:p-3 rounded-2xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg sm:text-xl group-hover:scale-105 transition-transform">
              🛡️
            </div>
            <span className="font-bold text-xs text-neutral-900 mt-1.5 group-hover:text-black truncate w-full px-0.5">
              Walk
            </span>
            <span className="text-[10px] font-extrabold text-emerald-700 mt-0.5 truncate w-full px-0.5">
              ₹0 Walk
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Pan-India Interactive Mini Map */}
      <div className="bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-800">
              Live Transit Map
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
              <span>{isLocating ? 'Detecting...' : 'Locate Me'}</span>
            </button>
          </div>
        </div>

        <div className="h-[240px] sm:h-[320px] w-full rounded-xl sm:rounded-2xl overflow-hidden border border-neutral-200 relative z-0 isolate">
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
