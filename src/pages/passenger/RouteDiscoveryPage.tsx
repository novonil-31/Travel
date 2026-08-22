import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button, Modal } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, ArrowRight, Clock, ShieldCheck, ChevronRight,
  Car, Sparkles, Check, ChevronDown, Bus, Footprints,
  MapPin, AlertCircle, Phone, Info, Radio, Users, Calendar
} from 'lucide-react';
import type { RouteSearchResult } from '../../types';
import { OFFICIAL_STOPS, getLiveStopArrivals, getNearestOfficialStop, type LiveUpcomingBus, type TransitStopInfo } from '../../data/liveTimetable';

// Custom Minimalist Map Pins
const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-route-pin',
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
        font-weight: 900;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const originPin = createMapPin('#10b981', 'A');
const destPin = createMapPin('#ef4444', 'B');
const taxiPin = createMapPin('#f59e0b', '🚖');
const stopPin = createMapPin('#2563eb', '🚏');
const otherStopPin = createMapPin('#4b5563', '•');

// Auto fit Leaflet bounds smoothly
function MapBoundsController({ coordinates }: { coordinates: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch {
        // ignore bounds error
      }
    }
  }, [coordinates, map]);
  return null;
}

export default function RouteDiscoveryPage() {
  const navigate = useNavigate();
  const { state, startJourney } = useAppStore();
  const { searchResults } = state;

  const [selectedRoute, setSelectedRoute] = useState<RouteSearchResult | null>(
    searchResults[0] || null
  );
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showTimetableModal, setShowTimetableModal] = useState<boolean>(false);
  const [selectedTimetableStop, setSelectedTimetableStop] = useState<TransitStopInfo | null>(null);
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every minute for accurate relative arrival times
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Update selected route if search results change
  useEffect(() => {
    if (searchResults.length > 0 && !selectedRoute) {
      setSelectedRoute(searchResults[0]);
    }
  }, [searchResults, selectedRoute]);

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto">
          <Navigation className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-neutral-900">No Routes Planned Yet</h2>
        <p className="text-xs text-neutral-500">
          Search for your pickup and destination stop to find accessible buses and shared auto stands.
        </p>
        <Button onClick={() => navigate('/plan')} size="sm">
          Plan Accessible Route
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

  // Safe coordinates extraction for Leaflet Polyline
  const fullRouteArr: Array<[number, number]> = selectedRoute?.geometry?.fullRoute || [];
  const originCoords: [number, number] =
    fullRouteArr.length > 0 ? fullRouteArr[0] : [20.3555, 85.8145];
  const destCoords: [number, number] =
    fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1] : [20.3450, 85.8180];

  // Clean continuous route line from start to end (just like Google Maps)
  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  // Find nearest official transit stop for pickup location
  const nearestOfficial = getNearestOfficialStop(originCoords[0], originCoords[1]);
  const activeBoardingStop = nearestOfficial.stop;

  // Calculate detailed pickup & arrival timing relative to current time
  const walkToPickupMinutes = nearestOfficial.walkingMinutes;
  const walkToPickupDistanceMeters = nearestOfficial.distanceMeters;

  const liveArrivalsForBoarding = getLiveStopArrivals(activeBoardingStop.id, currentTime);
  const nextEarliestBus = liveArrivalsForBoarding[0];

  const busWaitMinutes = nextEarliestBus ? nextEarliestBus.minutesAway : 5;
  const formattedBusArrivalTime = nextEarliestBus ? nextEarliestBus.scheduledTime : '08:45 AM';

  const boardingStopName = activeBoardingStop.name;
  const alightingStopName = selectedRoute?.segments?.[selectedRoute.segments.length - 1]?.from || `${selectedRoute?.destinationName} Transit Station`;

  const finalWalkMinutes = Math.max(1, selectedRoute?.segments?.[selectedRoute.segments.length - 1]?.duration || 1);
  const finalWalkDistanceMeters = Math.round(finalWalkMinutes * 60);

  const totalWalkDistanceMeters = walkToPickupDistanceMeters + finalWalkDistanceMeters;

  const handleOpenTimetable = (stop: TransitStopInfo) => {
    setSelectedTimetableStop(stop);
    setShowTimetableModal(true);
  };

  const modalArrivals = selectedTimetableStop
    ? getLiveStopArrivals(selectedTimetableStop.id, currentTime)
    : liveArrivalsForBoarding;

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
        <div className="lg:col-span-7 h-[380px] sm:h-[500px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative z-0 isolate">
          <MapContainer
            center={originCoords}
            zoom={14}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ zIndex: 1 }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBoundsController coordinates={continuousRoute} />

            {/* All Nearby Official Transit Stops with Live Schedule Popups */}
            {OFFICIAL_STOPS.map((st) => (
              <Marker
                key={st.id}
                position={[st.lat, st.lng]}
                icon={st.id === activeBoardingStop.id ? stopPin : otherStopPin}
              >
                <Popup>
                  <div className="p-1.5 space-y-1.5 max-w-[200px]">
                    <div>
                      <strong className="block text-xs font-bold text-blue-900">🚏 {st.name}</strong>
                      <span className="text-[10px] text-neutral-600 block">
                        {st.hasRamp ? '♿ 100% Low-Floor Ramp' : 'Standard Access'} • {st.bayNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenTimetable(st)}
                      className="w-full py-1 px-2 rounded-lg bg-black text-white text-[10px] font-bold shadow-xs hover:bg-neutral-800"
                    >
                      View Live Arrival Board
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 1. Origin Marker A */}
            <Marker position={originCoords} icon={originPin}>
              <Popup>
                <div className="p-1">
                  <strong className="block text-xs font-bold text-emerald-900">Pickup Origin (A)</strong>
                  <span className="text-[11px] text-neutral-600">{selectedRoute?.originName}</span>
                </div>
              </Popup>
            </Marker>

            {/* Continuous Blue Route Line */}
            <Polyline
              positions={continuousRoute}
              color="#2563eb"
              weight={6}
              opacity={0.9}
            />

            {/* 3. Destination Marker B */}
            <Marker position={destCoords} icon={destPin}>
              <Popup>
                <div className="p-1">
                  <strong className="block text-xs font-bold text-red-900">Destination (B)</strong>
                  <span className="text-[11px] text-neutral-600">{selectedRoute?.destinationName}</span>
                </div>
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
            <span>{selectedRoute?.duration} min via {selectedRoute?.route.name}</span>
          </div>
        </div>

        {/* Uber/Ola Style Clean Ride Options Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
            Choose Your Transit Option:
          </span>

          {/* Ride Options Cards */}
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
                      {result.route.vehicleType === 'shared-transport' ? '🚖' : '🚌'}
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

          {/* Detailed Transit Pickup, Stop Location & Live Arrival Time Breakdown Card */}
          {selectedRoute && (
            <div className="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Exact Pickup & Drop-off Breakdown
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Total Walk: {totalWalkDistanceMeters}m
                </span>
              </div>

              {/* Step 1: Walk to nearest Boarding Stop */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-neutral-900 font-bold">Catch Vehicle At: {boardingStopName}</strong>
                    <span className="text-emerald-700 font-bold">{walkToPickupDistanceMeters}m walk</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Walk <strong>{walkToPickupDistanceMeters}m (~{walkToPickupMinutes} mins)</strong> from your starting point to the designated stop ({activeBoardingStop.bayNumber || 'Main Stop'}).
                  </p>

                  <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-blue-900 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" /> Next Vehicle Arrival:
                      </span>
                      <span className="font-bold bg-white px-2 py-0.5 rounded-md shadow-xs text-blue-800">
                        {formattedBusArrivalTime} ({busWaitMinutes}m away)
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-blue-100/80 text-[10px] text-blue-800">
                      <span>Vehicle: <strong>{nextEarliestBus?.vehicleNumber || 'OD-02-B-1024'}</strong> • ♿ Ramp Certified</span>
                      <button
                        type="button"
                        onClick={() => handleOpenTimetable(activeBoardingStop)}
                        className="font-bold underline text-blue-900 hover:text-black"
                      >
                        View Full Stop Timetable →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: In-Vehicle Ride */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <strong className="text-neutral-900 font-bold">Ride {selectedRoute.route.name}</strong>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Ride for approx. <strong>{Math.max(5, selectedRoute.duration - walkToPickupMinutes - finalWalkMinutes)} mins</strong> in vehicle. {selectedRoute.stairs === 0 ? '♿ 100% Step-free flat ramp access.' : 'Standard transit entry.'}
                  </p>
                </div>
              </div>

              {/* Step 3: Alighting & Final Walk */}
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-neutral-900 font-bold">Get Down At: {alightingStopName}</strong>
                    <span className="text-neutral-600 font-bold">{finalWalkDistanceMeters}m walk</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Walk remaining <strong>{finalWalkDistanceMeters}m (~{finalWalkMinutes} min)</strong> to your exact final destination.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Big Clean Black Start Button */}
          <Button
            size="lg"
            onClick={handleStart}
            className="w-full py-4 text-base font-black rounded-2xl bg-black hover:bg-neutral-800 text-white shadow-lg flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span>Start Live Navigation</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Clean Collapsible Step-by-Step Directions */}
          <div className="pt-1">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span>{showSteps ? 'Hide' : 'View'} Complete Turn-by-Turn ({selectedRoute?.turnByTurn?.length || 4} Instructions)</span>
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

      {/* Official Live Bus Timetable & Stop Arrival Board Modal */}
      <Modal
        open={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        title={`🚏 Live Arrival Board — ${selectedTimetableStop?.name || activeBoardingStop.name}`}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Stop metadata badge bar */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-neutral-700">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900">{selectedTimetableStop?.bayNumber || 'Platform 1'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">♿ Certified Wheelchair Ramp</span>
              <span>•</span>
              <span>Sheltered Stop</span>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500">
              Live Feed: Updated {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Upcoming Bus Datasheet Table */}
          <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
            <div className="bg-neutral-100 px-4 py-2.5 font-bold text-neutral-600 grid grid-cols-12 text-[11px] uppercase tracking-wider">
              <div className="col-span-4">Line & Destination</div>
              <div className="col-span-3">Scheduled Arrival</div>
              <div className="col-span-3">Status & Headway</div>
              <div className="col-span-2 text-right">Accessibility</div>
            </div>

            {modalArrivals.map((bus, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-neutral-50 transition-colors">
                <div className="col-span-4 space-y-0.5">
                  <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-black text-white rounded font-black text-[10px]">
                      {bus.routeNumber}
                    </span>
                    <span>To {bus.destination}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">Bus #{bus.vehicleNumber}</div>
                </div>

                <div className="col-span-3">
                  <div className="font-black text-neutral-900 text-sm">{bus.scheduledTime}</div>
                  <div className="text-[10px] text-neutral-500">{bus.minutesAway} mins from now</div>
                </div>

                <div className="col-span-3 space-y-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    bus.status === 'ARRIVING_NOW'
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : bus.status === 'DELAYED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {bus.status === 'ARRIVING_NOW' ? '⚡ Arriving Now' : bus.status === 'DELAYED' ? `+${bus.delayMinutes}m Delay` : 'On Time'}
                  </span>
                  <div className="text-[10px] text-neutral-500">
                    Occupancy: {bus.occupancyPercent}% ({bus.crowding})
                  </div>
                </div>

                <div className="col-span-2 text-right">
                  {bus.hasRamp ? (
                    <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      ♿ Ramp
                    </span>
                  ) : (
                    <span className="inline-block bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md text-[10px]">
                      Standard
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowTimetableModal(false)}>
              Close Timetable
            </Button>
          </div>
        </div>
      </Modal>

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
