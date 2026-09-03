import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button, Card, Badge } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  MapPin, Navigation, ArrowRight, Clock, Bus, Car,
  ShieldCheck, ChevronRight, Search, Sparkles
} from 'lucide-react';
import { DEMO_STOPS, DEMO_TRANSPORT_STANDS } from '../../data/mock';

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

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { currentUser, activeJourney } = state;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Welcome & Search Header (Ola / Uber Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {greeting}, {currentUser?.name || 'Passenger'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Book accessible bus routes, shared auto micro-transit, and step-free journeys.
          </p>
        </div>

        <Link to="/plan">
          <Button size="sm" className="shadow-sm">
            <Navigation className="w-3.5 h-3.5 mr-1.5" /> Book a Ride
          </Button>
        </Link>
      </div>

      {/* Main Search Bar Card (Uber / Ola "Where to?" Banner) */}
      <div
        onClick={() => navigate('/plan')}
        className="bg-white border border-neutral-200 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-colors shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black text-neutral-900 group-hover:text-black block">
              Where to?
            </span>
            <span className="text-xs text-neutral-500 block">
              Enter destination for step-free routes, live buses & auto stands
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-100 group-hover:bg-black group-hover:text-white px-3.5 py-2 rounded-xl transition-all">
          <span>Search</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Active Navigation Card (If trip active) */}
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
                  Active Ride in Progress
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800">
                  Live
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
              <span>Open Navigation</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </Link>
        </div>
      )}

      {/* Ola-style 3 Quick Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Service 1: Accessible Bus */}
        <div
          onClick={() => navigate('/plan')}
          className="p-5 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-sm hover:scale-[1.01]"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg mb-3">
            🚌
          </div>
          <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
            Public Bus Transit
          </span>
          <span className="text-xs text-neutral-500 block mt-0.5">
            ♿ Low-floor electric buses with certified wheelchair ramps.
          </span>
          <span className="text-[11px] font-bold text-emerald-700 block mt-2">
            From ₹15 - ₹20
          </span>
        </div>

        {/* Service 2: Shared Auto / Taxi */}
        <div
          onClick={() => navigate('/plan')}
          className="p-5 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-sm hover:scale-[1.01]"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg mb-3">
            🚖
          </div>
          <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
            Shared Auto & Taxi
          </span>
          <span className="text-xs text-neutral-500 block mt-0.5">
            Quick point-to-point micro-transit from nearest stands.
          </span>
          <span className="text-[11px] font-bold text-amber-800 block mt-2">
            From ₹25 - ₹40
          </span>
        </div>

        {/* Service 3: Step-Free Walking */}
        <div
          onClick={() => navigate('/plan')}
          className="p-5 rounded-3xl bg-white border border-neutral-200 hover:border-black transition-all cursor-pointer group shadow-sm hover:scale-[1.01]"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg mb-3">
            🛡️
          </div>
          <span className="font-bold text-sm text-neutral-900 block group-hover:text-black">
            Safe Corridor Routing
          </span>
          <span className="text-xs text-neutral-500 block mt-0.5">
            Well-lit night streets with verified step-free elevators.
          </span>
          <span className="text-[11px] font-bold text-neutral-700 block mt-2">
            100% Free
          </span>
        </div>
      </div>

      {/* Clean Interactive Mini Map of Nearby Stops & Stands */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-900" />
            Nearby Stops & Transport Stands
          </span>
          <span className="text-[11px] font-semibold text-neutral-500">
            Tap markers to view fares
          </span>
        </div>

        <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-neutral-200 relative z-0 isolate">
          <MapContainer
            center={[20.3530, 85.8160]}
            zoom={14}
            scrollWheelZoom={false}
            className="w-full h-full"
            style={{ zIndex: 1 }}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
            />

            {/* Public Bus Stops */}
            {DEMO_STOPS.slice(0, 6).map((stop) => (
              <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopPin}>
                <Popup>
                  <div className="p-1 text-xs">
                    <strong className="block font-bold text-blue-900">🚏 {stop.name}</strong>
                    <span className="text-neutral-600 block mt-0.5">{stop.hasRamp ? '♿ Ramp Certified' : 'Standard Access'}</span>
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
                    <span className="text-neutral-600 block mt-0.5">Typical Fare: ₹{stand.typicalFareMin} - ₹{stand.typicalFareMax}</span>
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
