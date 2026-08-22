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
  MapPin, AlertCircle, Phone, Info, Radio, Users, Calendar,
  Compass, Zap, CornerDownRight, ExternalLink, Star, Shield
} from 'lucide-react';
import type { RouteSearchResult } from '../../types';
import {
  OFFICIAL_STOPS,
  OFFICIAL_ROUTES,
  getLiveStopArrivals,
  getNearestOfficialStop,
  getWaysToReachStop,
  calculateSharedAutoProbability,
  getOnDemandTaxiLive,
  type LiveUpcomingBus,
  type TransitStopInfo,
  type FirstMileOption,
} from '../../data/liveTimetable';

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
  const [showWaysToReach, setShowWaysToReach] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every 30s for accurate relative arrival times
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

  // Multimodal available ways to reach this bus stop
  const waysToReachList = getWaysToReachStop(originCoords[0], originCoords[1], activeBoardingStop);

  // Live upcoming bus arrival data for this boarding stop
  const liveArrivalsForBoarding = getLiveStopArrivals(activeBoardingStop.id, currentTime);

  // Match the selected route to the specific official line
  const isAutoDirect = selectedRoute?.route.id === 'AUTO_DIRECT';
  const isBikeTaxi = selectedRoute?.route.id === 'BIKE_TAXI';
  const isSharedAuto = selectedRoute?.route.id === 'S1' || selectedRoute?.route.vehicleType === 'shared-transport' && !isAutoDirect && !isBikeTaxi;
  const isExpressBus = selectedRoute?.route.id === 'C2';

  const matchedOfficialRoute = isExpressBus
    ? OFFICIAL_ROUTES['11']
    : OFFICIAL_ROUTES['10'];

  const matchedUpcomingBus = isExpressBus
    ? liveArrivalsForBoarding.find(b => b.routeId === '11') || liveArrivalsForBoarding[0]
    : liveArrivalsForBoarding.find(b => b.routeId === '10') || liveArrivalsForBoarding[0];

  const busWaitMinutes = matchedUpcomingBus ? matchedUpcomingBus.minutesAway : 6;
  const formattedBusArrivalTime = matchedUpcomingBus ? matchedUpcomingBus.scheduledTime : '09:35 AM';
  const actualVehiclePlate = matchedUpcomingBus?.vehicleNumber || (isExpressBus ? 'OD-02-BB-2104' : 'OD-02-BA-1025');
  const actualBusModel = isExpressBus
    ? 'Ashok Leyland JanBus AC Express'
    : 'Tata Starbus EV (100% Low-Floor Hydraulic Ramp)';

  // Shared Auto Probability Engine Data
  const sharedStandProbability = calculateSharedAutoProbability(originCoords[0], originCoords[1], currentTime);

  // On-Demand Taxi Data
  const directDistanceKm = Math.max(1, (selectedRoute?.duration || 15) * 0.4);
  const onDemandAutoData = getOnDemandTaxiLive('auto', directDistanceKm, currentTime);
  const onDemandBikeData = getOnDemandTaxiLive('bike', directDistanceKm, currentTime);

  const boardingStopName = activeBoardingStop.name;
  const alightingStopName = selectedRoute?.segments?.[selectedRoute.segments.length - 1]?.from || `${selectedRoute?.destinationName} Transit Station`;

  const walkToPickupMinutes = isAutoDirect || isBikeTaxi ? 0 : nearestOfficial.walkingMinutes;
  const walkToPickupDistanceMeters = isAutoDirect || isBikeTaxi ? 0 : nearestOfficial.distanceMeters;

  const finalWalkMinutes = isAutoDirect || isBikeTaxi ? 0 : Math.max(1, selectedRoute?.segments?.[selectedRoute.segments.length - 1]?.duration || 1);
  const finalWalkDistanceMeters = isAutoDirect || isBikeTaxi ? 0 : Math.round(finalWalkMinutes * 60);
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
                  <div className="p-1.5 space-y-1.5 max-w-[210px]">
                    <div>
                      <strong className="block text-xs font-bold text-blue-900">🚏 {st.name}</strong>
                      <span className="text-[10px] text-neutral-600 block">
                        {st.bayNumber} • {st.hasRamp ? '♿ Low-Floor Ramp' : 'Standard'}
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

              const displayName =
                result.route.id === 'C3'
                  ? 'Mo Bus (Route 10 City Line)'
                  : result.route.id === 'C2'
                  ? 'Mo Bus (Route 11 Fast Express)'
                  : result.route.id === 'AUTO_DIRECT'
                  ? 'Direct Auto (Rapido/Uber)'
                  : result.route.id === 'BIKE_TAXI'
                  ? 'Bike Taxi (Rapido Solo)'
                  : result.route.name;

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
                      {result.route.id === 'AUTO_DIRECT'
                        ? '🛺'
                        : result.route.id === 'BIKE_TAXI'
                        ? '🛵'
                        : result.route.vehicleType === 'shared-transport'
                        ? '🚖'
                        : result.route.vehicleType === 'campus-vehicle'
                        ? '🛺'
                        : '🚌'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm leading-tight block">
                          {displayName}
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

          {/* Detailed Transit Telemetry & Probability Breakdown Card */}
          {selectedRoute && (
            <div className="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {isAutoDirect
                    ? 'Direct Doorstep Auto Telemetry'
                    : isBikeTaxi
                    ? 'Rapido Bike Taxi Telemetry'
                    : isSharedAuto
                    ? 'Shared Auto Stand & Finding Probability'
                    : 'Actual Bus Running & Corridor Telemetry'}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Total Walk: {totalWalkDistanceMeters}m
                </span>
              </div>

              {/* 1. Direct Auto Rickshaw Case (Doorstep) */}
              {isAutoDirect ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-xs">
                          🛺 Rapido / Uber Auto
                        </span>
                        <span className="font-bold text-neutral-900 text-xs">
                          {onDemandAutoData.vehicleModel}
                        </span>
                      </div>
                      <span className="text-amber-800 bg-white font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
                        ⚡ Arriving in {onDemandAutoData.driverEtaMinutes} mins
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <strong>{onDemandAutoData.driverRating}</strong> ({onDemandAutoData.tripCount}+ trips)
                      </span>
                      <span>•</span>
                      <span>🚪 Doorstep Direct Pickup (0m walk)</span>
                    </div>

                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-amber-200/60">
                      Fare: ₹{selectedRoute.fare?.type === 'exact' ? selectedRoute.fare.exact : 45} (Official Base ₹30 + ₹12/km meter rate).
                    </div>
                  </div>

                  <a
                    href="https://rapido.onelink.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Book on Rapido Auto (1-Tap Direct Bridge)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : isBikeTaxi ? (
                /* 2. Bike Taxi Case (Rapido/Uber Moto) */
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-600 text-white font-black text-xs">
                          🛵 Rapido Bike Taxi
                        </span>
                        <span className="font-bold text-neutral-900 text-xs">
                          {onDemandBikeData.vehicleModel}
                        </span>
                      </div>
                      <span className="text-cyan-900 bg-white font-bold px-2 py-0.5 rounded-md text-[10px] border border-cyan-200">
                        ⚡ Arriving in {onDemandBikeData.driverEtaMinutes} mins
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <strong>{onDemandBikeData.driverRating}</strong> ({onDemandBikeData.tripCount}+ trips)
                      </span>
                      <span>•</span>
                      <span>🪖 Clean Helmet & Safety Shield</span>
                    </div>

                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-cyan-200/60">
                      Fastest single-rider commute. Beats traffic by ~15 mins.
                    </div>
                  </div>

                  <a
                    href="https://rapido.onelink.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Book on Rapido Bike Taxi</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : isSharedAuto ? (
                /* 3. Shared Auto Stand with LIVE PROBABILITY ENGINE */
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                        <strong className="text-purple-900 text-xs uppercase tracking-wider">
                          Auto Finding Probability:
                        </strong>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-600 text-white font-black text-xs rounded-full shadow-xs">
                        {sharedStandProbability.probabilityPercent}% High Probability
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 bg-white rounded-xl border border-purple-100">
                        <span className="text-[10px] text-neutral-500 block">Vehicles at Stand:</span>
                        <strong className="text-neutral-900 text-xs">~{sharedStandProbability.availableVehiclesCount} Shared Autos Waiting</strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-purple-100">
                        <span className="text-[10px] text-neutral-500 block">Average Headway:</span>
                        <strong className="text-neutral-900 text-xs">Departs every {sharedStandProbability.averageHeadwayMinutes} mins</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-purple-950 space-y-1">
                      <div>
                        <strong>Catch At Stand:</strong> {sharedStandProbability.standName} (~{sharedStandProbability.distanceMeters}m walk)
                      </div>
                      <div>
                        <strong>Corridor Flow:</strong> {sharedStandProbability.operatingRoute}
                      </div>
                      <div className="text-[10px] text-neutral-500 pt-0.5">
                        Fixed Fare: {sharedStandProbability.fixedFareText} • Pay cash or UPI to driver on boarding.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 4. Official City Bus Corridor (Mo Bus Route 10 / 11) */
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-neutral-900 font-bold">Catch Vehicle At: {boardingStopName}</strong>
                        <span className="text-emerald-700 font-bold">{walkToPickupDistanceMeters}m walk</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Board at <strong>{activeBoardingStop.bayNumber}</strong>. Located ~{walkToPickupMinutes} mins from your origin point.
                      </p>

                      {/* Actual Bus Live Telemetry Card */}
                      <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-black text-white font-black text-xs">
                              {matchedOfficialRoute?.routeNumber || 'Route 10'}
                            </span>
                            <span className="font-bold text-neutral-900 text-xs">
                              Vehicle #{actualVehiclePlate}
                            </span>
                          </div>
                          <span className="text-blue-800 bg-blue-50 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-100">
                            {formattedBusArrivalTime} ({busWaitMinutes}m away)
                          </span>
                        </div>

                        <div className="text-[11px] text-neutral-600 space-y-1">
                          <div>
                            <strong>Full Corridor:</strong> {matchedOfficialRoute?.originTerminus} ➡️ {matchedOfficialRoute?.destTerminus}
                          </div>
                          <div>
                            <strong>Model:</strong> {actualBusModel}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-0.5">
                            <span>📅 {matchedOfficialRoute?.operatingDays}</span>
                            <span>•</span>
                            <span>⏰ {matchedOfficialRoute?.operatingHours}</span>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between border-t border-neutral-200/80 text-[10px]">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            {matchedOfficialRoute?.hasRamp ? '♿ Low-Floor Ramp Certified' : 'Standard Transit'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenTimetable(activeBoardingStop)}
                            className="font-bold underline text-blue-900 hover:text-black"
                          >
                            View Full Stop Timetable →
                          </button>
                        </div>
                      </div>

                      {/* Available Ways to Reach This Bus Stop Button & Selector */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowWaysToReach(!showWaysToReach)}
                          className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 underline"
                        >
                          <span>{showWaysToReach ? 'Hide' : 'Show'} Available Ways to Reach This Bus Stop ({waysToReachList.length} Options)</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${showWaysToReach ? 'rotate-180' : ''}`} />
                        </button>

                        {showWaysToReach && (
                          <div className="mt-2 space-y-1.5 p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-[11px]">
                            {waysToReachList.map((way, wIdx) => (
                              <div key={wIdx} className="p-2 bg-white rounded-lg border border-blue-100 flex items-start justify-between gap-2">
                                <div>
                                  <strong className="text-neutral-900 block font-bold">{way.title}</strong>
                                  <span className="text-[10px] text-neutral-500 block leading-tight mt-0.5">{way.description}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-neutral-800 text-[10px] block">{way.durationMinutes} min</span>
                                  <span className="text-[9px] text-emerald-700 font-semibold">{way.fareEstimate}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: In-Vehicle Ride */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <strong className="text-neutral-900 font-bold">Ride {selectedRoute.route.name}</strong>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Ride for approx. <strong>{Math.max(5, selectedRoute.duration - walkToPickupMinutes - finalWalkMinutes)} mins</strong>. Priority seating and ramp assistance available.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Alighting & Final Walk */}
                  <div className="flex items-start gap-3">
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
              <span className="font-bold text-neutral-900">{selectedTimetableStop?.bayNumber || activeBoardingStop.bayNumber}</span>
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
              <div className="col-span-4">Line & Corridor</div>
              <div className="col-span-3">Scheduled Arrival</div>
              <div className="col-span-3">Status & Vehicle</div>
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
                  <div className="text-[10px] text-neutral-500">From {bus.originTerminus}</div>
                </div>

                <div className="col-span-3">
                  <div className="font-black text-neutral-900 text-sm">{bus.scheduledTime}</div>
                  <div className="text-[10px] text-neutral-500">{bus.minutesAway} mins away</div>
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
                  <div className="text-[10px] text-neutral-600 font-semibold">
                    Plate: {bus.vehicleNumber}
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
