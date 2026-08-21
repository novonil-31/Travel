import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge, Modal } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, Clock, Bus, MapPin, ChevronRight, ShieldCheck,
  Footprints, Sparkles, ArrowRight, IndianRupee, Car, Scale, ChevronDown
} from 'lucide-react';
import type { RouteSearchResult } from '../../types';

// Custom Map Pins (Clean Google Maps Style)
const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2px solid white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 12px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        ${label}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const originPin = createMapPin('#059669', 'A');
const destPin = createMapPin('#dc2626', 'B');
const stopPin = createMapPin('#2563eb', '🚏');
const taxiPin = createMapPin('#d97706', '🚖');

// Map Bounds Auto-Fitter
function MapBoundsController({ coordinates }: { coordinates: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
      try {
        const validCoords = coordinates.filter(
          (c) => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && !isNaN(c[0]) && typeof c[1] === 'number' && !isNaN(c[1])
        );
        if (validCoords.length > 0) {
          const bounds = L.latLngBounds(validCoords.map(([lat, lng]) => [lat, lng]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          }
        }
      } catch (e) {
        // ignore bounds fit error
      }
    }
  }, [coordinates, map]);

  return null;
}

export default function RouteDiscoveryPage() {
  const navigate = useNavigate();
  const { state, startJourney } = useAppStore();
  const { searchResults } = state;

  const [selectedRoute, setSelectedRoute] = useState<RouteSearchResult | null>(searchResults[0] || null);
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  useEffect(() => {
    if (searchResults && searchResults.length > 0 && !selectedRoute) {
      setSelectedRoute(searchResults[0] || null);
    }
  }, [searchResults, selectedRoute]);

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto">
          <Navigation className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-neutral-900">No Routes Found</h2>
        <p className="text-xs text-neutral-500">
          Please enter an origin and destination to plan your journey.
        </p>
        <Button onClick={() => navigate('/plan')} size="sm">
          Return to Search
        </Button>
      </div>
    );
  }

  const handleStart = () => {
    if (selectedRoute) {
      startJourney(selectedRoute);
      navigate(`/journey/${selectedRoute.route.id}`);
    }
  };

  // Coordinates for clean Google Maps line
  const fullRouteArr = selectedRoute?.geometry?.fullRoute || [];
  const originCoords: [number, number] = [
    selectedRoute?.originCoords?.lat || (fullRouteArr.length > 0 ? fullRouteArr[0][0] : 20.3555),
    selectedRoute?.originCoords?.lng || (fullRouteArr.length > 0 ? fullRouteArr[0][1] : 85.8145),
  ];

  const destCoords: [number, number] = [
    selectedRoute?.destinationCoords?.lat ||
      (fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1][0] : 20.3450),
    selectedRoute?.destinationCoords?.lng ||
      (fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1][1] : 85.8180),
  ];

  // Clean continuous route line from start to end (just like Google Maps)
  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4">
      {/* Top Simple Summary Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="font-bold text-neutral-900">{selectedRoute?.originName || 'Origin'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-bold text-neutral-900">{selectedRoute?.destinationName || 'Destination'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCompareModal(true)}
            className="text-xs font-semibold text-neutral-600 hover:text-black underline px-2 py-1"
          >
            Compare Fares
          </button>
          <Button size="sm" variant="secondary" onClick={() => navigate('/plan')}>
            Edit
          </Button>
        </div>
      </div>

      {/* Main Split Layout: Clean Map (Top/Left) + Clean Uber-Style Ride Selector (Bottom/Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Google Maps Style Clean Route Map (7 Cols) */}
        <div className="lg:col-span-7 h-[360px] sm:h-[450px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative">
          <MapContainer
            center={originCoords}
            zoom={14}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBoundsController coordinates={continuousRoute} />

            {/* 1. Start Marker (Green A) */}
            <Marker position={originCoords} icon={originPin}>
              <Popup>
                <span className="font-bold text-xs">Pickup (A): {selectedRoute?.originName}</span>
              </Popup>
            </Marker>

            {/* 2. Clean Start-to-End Continuous Route Polyline (Google Maps Vibrant Blue Line) */}
            <Polyline
              positions={continuousRoute}
              color="#2563eb"
              weight={6}
              opacity={0.9}
            />

            {/* 3. Destination Marker (Red B) */}
            <Marker position={destCoords} icon={destPin}>
              <Popup>
                <span className="font-bold text-xs">Destination (B): {selectedRoute?.destinationName}</span>
              </Popup>
            </Marker>

            {/* 4. Closest Shared Taxi / Auto Stand Pin */}
            {selectedRoute?.nearbyStands && selectedRoute.nearbyStands[0] && (
              <Marker
                position={[selectedRoute.nearbyStands[0].latitude, selectedRoute.nearbyStands[0].longitude]}
                icon={taxiPin}
              >
                <Popup>
                  <div className="p-1">
                    <strong className="block text-xs font-bold text-amber-900">
                      🚖 {selectedRoute.nearbyStands[0].name}
                    </strong>
                    <span className="text-[11px] text-neutral-600 block">
                      {selectedRoute.nearbyStands[0].distanceM}m from pickup • ₹{selectedRoute.nearbyStands[0].typicalFareMin || 15} - ₹{selectedRoute.nearbyStands[0].typicalFareMax || 30}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Simple Floating Route Badge */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-200 text-xs font-bold text-neutral-900 shadow-md z-[1000] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>{selectedRoute?.duration} min via {selectedRoute?.route.shortName}</span>
          </div>
        </div>

        {/* Uber/Ola Style Clean Ride Options Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
            Choose Your Ride:
          </span>

          <div className="space-y-2.5">
            {searchResults.map((result, idx) => {
              const isSelected = selectedRoute?.route.id === result.route.id;
              const fareDisplay = result.fare
                ? result.fare.type === 'exact'
                  ? `₹${result.fare.exact}`
                  : `₹${result.fare.min} - ₹${result.fare.max}`
                : '₹20';

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedRoute(result)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-black shadow-md scale-[1.01]'
                      : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  {/* Left: Icon & Name */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isSelected ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      {result.route.vehicleType === 'shared-transport' ? '🚖' : result.route.shortName}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm leading-tight block">
                          {result.route.name}
                        </span>
                        {result.recommendation.recommended && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
                            ♿ Step-Free
                          </span>
                        )}
                      </div>
                      <span className={`text-xs block mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {result.duration} min • {result.stairs === 0 ? '0 Stairs' : `${result.stairs} Stairs`}
                      </span>
                    </div>
                  </div>

                  {/* Right: Price */}
                  <div className="text-right shrink-0">
                    <span className="text-base font-black block leading-none">
                      {fareDisplay}
                    </span>
                    <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      Estimated
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simple Closest Taxi Stand Quick Bar */}
          {selectedRoute?.nearbyStands && selectedRoute.nearbyStands[0] && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold block">{selectedRoute.nearbyStands[0].name}</span>
                  <span className="text-[11px] text-amber-800">{selectedRoute.nearbyStands[0].distanceM}m away • ₹{selectedRoute.nearbyStands[0].typicalFareMin}-{selectedRoute.nearbyStands[0].typicalFareMax}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                Auto Stand
              </span>
            </div>
          )}

          {/* Big Clean Black Start Button (Like Uber/Ola "Confirm Ride") */}
          <Button
            size="lg"
            onClick={handleStart}
            className="w-full py-4 text-base font-black rounded-2xl bg-black hover:bg-neutral-800 text-white shadow-lg flex items-center justify-center gap-2"
          >
            <span>Start Navigation</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Clean Collapsible Step-by-Step Directions */}
          <div className="pt-2">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span>{showSteps ? 'Hide' : 'View'} Step-by-Step Route ({selectedRoute?.turnByTurn?.length || 4} Steps)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
            </button>

            {showSteps && selectedRoute && (
              <div className="mt-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs text-neutral-800">
                {(selectedRoute.turnByTurn && selectedRoute.turnByTurn.length > 0
                  ? selectedRoute.turnByTurn
                  : selectedRoute.segments.map(s => `${s.type.toUpperCase()}: ${s.from} → ${s.to}`)
                ).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simple Fare Compare Modal */}
      <Modal
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="Compare Routes & Prices"
        size="md"
      >
        <div className="divide-y divide-neutral-100 text-xs">
          {searchResults.map((r) => (
            <div key={r.route.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-neutral-900 block">{r.route.name}</span>
                <span className="text-neutral-500 text-xs">
                  {r.duration} min • {r.walkingDistance}m walking • {r.stairs === 0 ? '♿ Step-Free' : `${r.stairs} Stairs`}
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-base text-emerald-800 block">
                  {r.fare?.type === 'exact' ? `₹${r.fare.exact}` : `₹${r.fare?.min || 15} - ₹${r.fare?.max || 25}`}
                </span>
                <span className="text-[10px] text-neutral-500">{r.scores.overall}% Match</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
