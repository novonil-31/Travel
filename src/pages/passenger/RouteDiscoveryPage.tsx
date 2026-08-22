import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Modal } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, ArrowRight, ShieldCheck, ChevronRight,
  ChevronDown, MapPin, ExternalLink, Star, Compass,
  Sparkles, Check, Clock, Radio, Footprints, Users,
  Phone, Share2, Award, CheckCircle2, UserCheck
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
  getMatchingCarpools,
  registerCarpoolRequest,
  type TransitStopInfo,
  type CarpoolRide,
} from '../../data/liveTimetable';
import { haversineDistanceClient } from '../../utils/onlineRouting';

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
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
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
const meetingPin = createMapPin('#7c3aed', '🤝');

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
  const [searchParams] = useSearchParams();
  const { state, startJourney } = useAppStore();
  const { addToast } = useToast();
  const { searchResults } = state;

  const urlTimeMode = searchParams.get('timeMode') || 'now';
  const urlDepartTime = searchParams.get('departTime');

  // Compute base time according to user's chosen departure schedule
  const getInitialTime = () => {
    const d = new Date();
    if (urlTimeMode !== 'now' && urlDepartTime) {
      const [hh, mm] = urlDepartTime.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        d.setHours(hh, mm, 0, 0);
      }
    }
    return d;
  };

  const [currentTime, setCurrentTime] = useState<Date>(getInitialTime());
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showTimetableModal, setShowTimetableModal] = useState<boolean>(false);
  const [selectedTimetableStop, setSelectedTimetableStop] = useState<TransitStopInfo | null>(null);
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [showWaysToReach, setShowWaysToReach] = useState<boolean>(false);

  // Carpooling & Shared Taxi Matcher States
  const [showCarpoolListModal, setShowCarpoolListModal] = useState<boolean>(false);
  const [showRaisePoolModal, setShowRaisePoolModal] = useState<boolean>(false);
  const [showCarpoolConfirmedModal, setShowCarpoolConfirmedModal] = useState<boolean>(false);
  const [selectedCarpool, setSelectedCarpool] = useState<CarpoolRide | null>(null);

  // Raise Request Form Inputs
  const [poolDepartTimeInput, setPoolDepartTimeInput] = useState<string>(urlDepartTime || '09:30');
  const [poolSeatsInput, setPoolSeatsInput] = useState<number>(1);
  const [poolStepFreeInput, setPoolStepFreeInput] = useState<boolean>(false);

  // Update clock every 30s only if user chose 'now'
  useEffect(() => {
    if (urlTimeMode === 'now') {
      const timer = setInterval(() => setCurrentTime(new Date()), 30000);
      return () => clearInterval(timer);
    }
  }, [urlTimeMode]);

  // Keep selected index within range
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(0);
    }
  }, [searchResults, selectedIndex]);

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 font-sans">
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

  // Active selected route object strictly based on selectedIndex
  const selectedRoute: RouteSearchResult = searchResults[selectedIndex] || searchResults[0];

  const handleStart = () => {
    if (selectedRoute) {
      startJourney(selectedRoute);
      navigate(`/journey/${selectedRoute.route.id}`);
    }
  };

  // Extract precise coordinates for origin and destination
  const fullRouteArr: Array<[number, number]> = selectedRoute?.geometry?.fullRoute || [];
  const originCoords: [number, number] = [
    selectedRoute?.originCoords?.lat ?? (fullRouteArr[0] ? fullRouteArr[0][0] : 20.3555),
    selectedRoute?.originCoords?.lng ?? (fullRouteArr[0] ? fullRouteArr[0][1] : 85.8145),
  ];
  const destCoords: [number, number] = [
    selectedRoute?.destinationCoords?.lat ?? (fullRouteArr[fullRouteArr.length - 1] ? fullRouteArr[fullRouteArr.length - 1][0] : 20.3450),
    selectedRoute?.destinationCoords?.lng ?? (fullRouteArr[fullRouteArr.length - 1] ? fullRouteArr[fullRouteArr.length - 1][1] : 85.8180),
  ];

  // Continuous route path for the selected transit mode
  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  // Identify the selected mode based on route properties, route name, and selection index
  const routeId = selectedRoute?.route?.id || '';
  const routeName = (selectedRoute?.route?.name || '').toLowerCase();

  const isAutoDirect = routeId === 'AUTO_DIRECT' || routeName.includes('direct auto') || selectedIndex === 2;
  const isBikeTaxi = routeId === 'BIKE_TAXI' || routeName.includes('bike') || selectedIndex === 4;
  const isSharedAuto =
    !isAutoDirect && !isBikeTaxi &&
    (routeId === 'S1' || routeName.includes('sharing') || routeName.includes('shared') || selectedIndex === 3 || selectedRoute?.route?.vehicleType === 'shared-transport');
  const isExpressBus =
    !isAutoDirect && !isBikeTaxi && !isSharedAuto &&
    (routeId === 'C2' || routeId.includes('11') || routeName.includes('express') || selectedIndex === 1);

  // Dynamic Bus Line & Stop Matching for ANY official route (10, 11, 12, 13, 16, 18, 20, 23, 24, 33, 50)
  const matchedOfficialRoute = OFFICIAL_ROUTES[routeId] || (isExpressBus ? OFFICIAL_ROUTES['11'] : OFFICIAL_ROUTES['10']);
  const servingRouteId = matchedOfficialRoute.id;

  const candidateStops = OFFICIAL_STOPS.filter(s => s.servingRoutes.includes(servingRouteId));
  const fallbackStops = candidateStops.length > 0 ? candidateStops : OFFICIAL_STOPS;

  // Use the pre-computed intermediate stops if available, or dynamically match closest
  const intermediateStops = selectedRoute?.intermediateStops || [];
  let activeBoardingStop = intermediateStops.length > 0
    ? OFFICIAL_STOPS.find(s => s.id === intermediateStops[0].id) || fallbackStops[0]
    : fallbackStops[0];

  let activeAlightingStop = intermediateStops.length > 1
    ? OFFICIAL_STOPS.find(s => s.id === intermediateStops[1].id) || fallbackStops[fallbackStops.length - 1]
    : fallbackStops[fallbackStops.length - 1];

  let minBoardDist = haversineDistanceClient(originCoords[0], originCoords[1], activeBoardingStop.lat, activeBoardingStop.lng);
  let minAlightDist = haversineDistanceClient(destCoords[0], destCoords[1], activeAlightingStop.lat, activeAlightingStop.lng);

  if (intermediateStops.length < 2) {
    minBoardDist = Infinity;
    fallbackStops.forEach(st => {
      const dist = haversineDistanceClient(originCoords[0], originCoords[1], st.lat, st.lng);
      if (dist < minBoardDist) {
        minBoardDist = dist;
        activeBoardingStop = st;
      }
    });

    minAlightDist = Infinity;
    fallbackStops.forEach(st => {
      const dist = haversineDistanceClient(destCoords[0], destCoords[1], st.lat, st.lng);
      if (dist < minAlightDist) {
        minAlightDist = dist;
        activeAlightingStop = st;
      }
    });
  }

  // Multimodal available ways to reach this specific bus stop
  const waysToReachList = getWaysToReachStop(originCoords[0], originCoords[1], activeBoardingStop);

  // Live upcoming bus arrival data for this boarding stop according to departure time
  const liveArrivalsForBoarding = getLiveStopArrivals(activeBoardingStop.id, currentTime);

  const matchedUpcomingBus =
    liveArrivalsForBoarding.find((b) => b.routeId === servingRouteId) || liveArrivalsForBoarding[0];

  const busWaitMinutes = matchedUpcomingBus ? matchedUpcomingBus.minutesAway : 6;
  const formattedBusArrivalTime = matchedUpcomingBus ? matchedUpcomingBus.scheduledTime : '09:35 AM';
  const actualVehiclePlate =
    matchedUpcomingBus?.vehicleNumber || (isExpressBus ? 'OD-02-BB-2104' : 'OD-02-BA-1025');
  const actualBusModel = isExpressBus
    ? 'Ashok Leyland JanBus AC Express'
    : 'Tata Starbus EV (100% Low-Floor Ramp)';

  // Shared Auto Probability Engine Data based on departure time
  const sharedStandProbability = calculateSharedAutoProbability(
    originCoords[0],
    originCoords[1],
    currentTime
  );

  // Intelligent Carpooling Corridor Matches for this Origin and Destination
  const matchingCarpools = getMatchingCarpools(
    originCoords[0],
    originCoords[1],
    destCoords[0],
    destCoords[1],
    urlDepartTime || '09:30'
  );

  // On-Demand Taxi Data
  const directDistanceKm = Math.max(1, (selectedRoute?.duration || 15) * 0.4);
  const onDemandAutoData = getOnDemandTaxiLive('auto', directDistanceKm, currentTime);
  const onDemandBikeData = getOnDemandTaxiLive('bike', directDistanceKm, currentTime);

  // Dynamic Stop & Pickup Names per selected vehicle mode
  const pickupLocationName = isAutoDirect
    ? `Doorstep Pickup at ${selectedRoute?.originName || 'Origin'}`
    : isBikeTaxi
    ? `Pickup Point at ${selectedRoute?.originName || 'Origin'}`
    : isSharedAuto
    ? `${sharedStandProbability.standName}`
    : `${activeBoardingStop.name} (${activeBoardingStop.bayNumber})`;

  const dropoffLocationName = isAutoDirect
    ? `Direct Drop-off at ${selectedRoute?.destinationName || 'Destination'}`
    : isBikeTaxi
    ? `Drop-off at ${selectedRoute?.destinationName || 'Destination'}`
    : isSharedAuto
    ? `${selectedRoute?.destinationName || 'Destination'} Auto Stop`
    : `${activeAlightingStop.name}`;

  const walkToPickupMinutes = isAutoDirect || isBikeTaxi ? 0 : Math.max(1, Math.round(minBoardDist / 65));
  const walkToPickupDistanceMeters = isAutoDirect || isBikeTaxi ? 0 : Math.round(minBoardDist);

  const finalWalkMinutes = isAutoDirect || isBikeTaxi ? 0 : Math.max(1, Math.round(minAlightDist / 65));
  const finalWalkDistanceMeters = isAutoDirect || isBikeTaxi ? 0 : Math.round(minAlightDist);
  const totalWalkDistanceMeters = walkToPickupDistanceMeters + finalWalkDistanceMeters;

  const handleOpenTimetable = (stop: TransitStopInfo) => {
    setSelectedTimetableStop(stop);
    setShowTimetableModal(true);
  };

  // Carpool Accept Action
  const handleAcceptCarpool = (carpool: CarpoolRide) => {
    setSelectedCarpool(carpool);
    setShowCarpoolListModal(false);
    setShowCarpoolConfirmedModal(true);
    addToast(
      'success',
      `🤝 Matched with ${carpool.hostName}! Meeting spot: ${carpool.optimalMeetingPoint.name} at ${carpool.meetingTime}.`
    );
  };

  // Raise Request Submission
  const handleRaisePoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = registerCarpoolRequest({
      originName: selectedRoute?.originName || 'Pickup Origin',
      originCoords,
      destinationName: selectedRoute?.destinationName || 'Destination',
      destinationCoords: destCoords,
      departTime: poolDepartTimeInput,
      seatsNeeded: poolSeatsInput,
      requiresStepFree: poolStepFreeInput,
    });

    setShowRaisePoolModal(false);
    setSelectedCarpool(created);
    setShowCarpoolConfirmedModal(true);
    addToast(
      'success',
      `📢 Carpool request broadcasted for ${poolDepartTimeInput}! Matching co-riders along your corridor.`
    );
  };

  const modalArrivals = selectedTimetableStop
    ? getLiveStopArrivals(selectedTimetableStop.id, currentTime)
    : liveArrivalsForBoarding;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4 font-sans">
      {/* Top Header Summary */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="font-bold text-neutral-900">{selectedRoute?.originName || 'Origin'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-bold text-neutral-900">{selectedRoute?.destinationName || 'Destination'}</span>
          <span className="text-[10px] text-neutral-500 font-bold px-2 py-0.5 bg-neutral-100 rounded-md ml-1">
            {urlTimeMode === 'now'
              ? '⚡ Leave Now'
              : `⏰ Depart ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </span>
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

      {/* Main Split Layout: Map (7 Cols) + Ride Selector & Clean Details (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CartoDB Voyager Clean High-Def Map */}
        <div className="lg:col-span-7 h-[380px] sm:h-[500px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative z-0 isolate">
          <MapContainer
            center={originCoords}
            zoom={14}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ zIndex: 1 }}
          >
            {/* Premium CartoDB Voyager Tiles */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <MapBoundsController coordinates={continuousRoute} />

            {/* If Public Bus selected: show the specific line's Boarding & Alighting stops */}
            {!isAutoDirect && !isBikeTaxi && !isSharedAuto && (
              <>
                <Marker position={[activeBoardingStop.lat, activeBoardingStop.lng]} icon={stopPin}>
                  <Popup>
                    <div className="p-1 space-y-1 max-w-[200px]">
                      <strong className="block text-xs font-bold text-blue-900">🚏 Board: {activeBoardingStop.name}</strong>
                      <span className="text-[10px] text-neutral-600 block">{activeBoardingStop.bayNumber} • {matchedOfficialRoute.routeNumber}</span>
                    </div>
                  </Popup>
                </Marker>

                <Marker position={[activeAlightingStop.lat, activeAlightingStop.lng]} icon={stopPin}>
                  <Popup>
                    <div className="p-1 space-y-1 max-w-[200px]">
                      <strong className="block text-xs font-bold text-blue-900">🚏 Alight: {activeAlightingStop.name}</strong>
                      <span className="text-[10px] text-neutral-600 block">{activeAlightingStop.bayNumber}</span>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* If Shared Auto selected: show designated stand pin */}
            {isSharedAuto && !selectedCarpool && (
              <Marker
                position={[
                  sharedStandProbability.distanceMeters ? originCoords[0] + 0.001 : originCoords[0],
                  originCoords[1] + 0.001,
                ]}
                icon={taxiPin}
              >
                <Popup>
                  <div className="p-1">
                    <strong className="block text-xs font-bold text-amber-900">
                      🚖 {sharedStandProbability.standName}
                    </strong>
                    <span className="text-[10px] text-neutral-600 block">
                      {sharedStandProbability.distanceMeters}m walk • {sharedStandProbability.fixedFareText}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* If Carpool is active: show common meeting point pin */}
            {selectedCarpool && (
              <Marker
                position={selectedCarpool.optimalMeetingPoint.coordinates}
                icon={meetingPin}
              >
                <Popup>
                  <div className="p-1 space-y-1 max-w-[220px]">
                    <strong className="block text-xs font-bold text-purple-900">
                      🤝 Meeting Point: {selectedCarpool.optimalMeetingPoint.name}
                    </strong>
                    <span className="text-[10px] text-neutral-600 block">
                      Meet at <strong>{selectedCarpool.meetingTime}</strong> with {selectedCarpool.hostName} ({selectedCarpool.vehicleModel})
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Origin Pin A */}
            <Marker position={originCoords} icon={originPin}>
              <Popup>
                <div className="p-1">
                  <strong className="block text-xs font-bold text-emerald-900">Pickup Origin (A)</strong>
                  <span className="text-[11px] text-neutral-600">{selectedRoute?.originName}</span>
                </div>
              </Popup>
            </Marker>

            {/* Continuous Mode Road Route Polyline */}
            <Polyline positions={continuousRoute} color="#2563eb" weight={6} opacity={0.9} />

            {/* Destination Pin B */}
            <Marker position={destCoords} icon={destPin}>
              <Popup>
                <div className="p-1">
                  <strong className="block text-xs font-bold text-red-900">Destination (B)</strong>
                  <span className="text-[11px] text-neutral-600">{selectedRoute?.destinationName}</span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Floating Badge */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-200 text-xs font-bold text-neutral-900 shadow-md z-[1000] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>
              {selectedRoute?.duration} min via {selectedRoute?.route.name}
            </span>
          </div>
        </div>

        {/* Right Pane: Clean Transit Selector & Minimalist Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
            Choose Your Transit Option:
          </span>

          {/* Clean Ride Options List */}
          <div className="space-y-2">
            {searchResults.map((result, idx) => {
              const isSelected = selectedIndex === idx;
              const fareDisplay = result.fare
                ? result.fare.type === 'exact'
                  ? `₹${result.fare.exact}`
                  : `₹${result.fare.min} - ₹${result.fare.max}`
                : '₹15';

              const displayName = result.route.name;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedIndex(idx);
                    if (result.route.id !== 'S1' && result.route.id !== 'Auto-Stand') setSelectedCarpool(null);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-black shadow-md scale-[1.01]'
                      : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isSelected ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      {result.route.id === 'AUTO_DIRECT'
                        ? '🛺'
                        : result.route.id === 'BIKE_TAXI'
                        ? '🛵'
                        : result.route.vehicleType === 'shared-transport'
                        ? '🚖'
                        : '🚌'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm leading-tight block">{displayName}</span>
                        {result.recommendation.recommended && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            ♿ Step-Free
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs block mt-0.5 ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {result.duration} min •{' '}
                        {result.stairs === 0 ? '0 Stairs' : `${result.stairs} Stairs`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black block leading-none">{fareDisplay}</span>
                    <span
                      className={`text-[10px] block mt-0.5 ${
                        isSelected ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      {result.fare?.status === 'confirmed' ? 'Govt Gazette' : 'Estimated'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Minimalist, Clean Selected Vehicle Details Card */}
          {selectedRoute && (
            <div className="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              {/* Header Title & Walk Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {isAutoDirect
                    ? 'Direct Auto (Doorstep Pickup)'
                    : isBikeTaxi
                    ? 'Rapido Solo Bike Taxi'
                    : isSharedAuto
                    ? 'Shared Taxi & Carpool Matcher'
                    : isExpressBus
                    ? 'Mo Bus (Route 11 Fast Express)'
                    : 'Mo Bus (Route 10 City Line)'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Total Walk: {totalWalkDistanceMeters}m
                </span>
              </div>

              {/* Case 1: Direct Auto (Uber/Ola/Rapido) */}
              {isAutoDirect ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">
                        {onDemandAutoData.vehicleModel}
                      </span>
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {onDemandAutoData.driverRating}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                      ⚡ ETA {onDemandAutoData.driverEtaMinutes} mins
                    </span>
                  </div>

                  {/* Clean 2-Step Direct Progression */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">{pickupLocationName}</strong>
                        <span className="text-[10px] text-emerald-700 font-semibold">0m walking (Door-to-Door)</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">{dropoffLocationName}</strong>
                        <span className="text-[10px] text-neutral-500">Direct entrance arrival</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed pt-1 border-t border-neutral-100">
                    Meter fare calculated for {directDistanceKm.toFixed(1)} km (Base ₹30 + ₹12/km).
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <a
                      href={`https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${originCoords[0]}&pickup[longitude]=${originCoords[1]}&pickup[formatted_address]=${encodeURIComponent(selectedRoute?.originName || 'Pickup')}&dropoff[latitude]=${destCoords[0]}&dropoff[longitude]=${destCoords[1]}&dropoff[formatted_address]=${encodeURIComponent(selectedRoute?.destinationName || 'Destination')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 rounded-xl bg-black text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs hover:bg-neutral-800 transition-colors"
                    >
                      <span>Uber Auto</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={`https://book.olacabs.com/?pickup_name=${encodeURIComponent(selectedRoute?.originName || 'Pickup')}&drop_name=${encodeURIComponent(selectedRoute?.destinationName || 'Destination')}&lat=${originCoords[0]}&lng=${originCoords[1]}&drop_lat=${destCoords[0]}&drop_lng=${destCoords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <span>Ola Auto</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href="https://rapido.onelink.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <span>Rapido</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : isBikeTaxi ? (
                /* Case 2: Bike Taxi (Rapido/Uber Moto) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">
                        {onDemandBikeData.vehicleModel}
                      </span>
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {onDemandBikeData.driverRating}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-200">
                      ⚡ ETA {onDemandBikeData.driverEtaMinutes} mins
                    </span>
                  </div>

                  {/* Clean 2-Step Bike Progression */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">{pickupLocationName}</strong>
                        <span className="text-[10px] text-cyan-700 font-semibold">Instant solo pickup</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">{dropoffLocationName}</strong>
                        <span className="text-[10px] text-neutral-500">Fastest transit (saves ~15m)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100">
                    <a
                      href="https://rapido.onelink.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Rapido Bike</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={`https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${originCoords[0]}&pickup[longitude]=${originCoords[1]}&dropoff[latitude]=${destCoords[0]}&dropoff[longitude]=${destCoords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Uber Moto</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : isSharedAuto ? (
                /* Case 3: Shared Auto Stand + SMART CARPOOLING CORRIDOR MATCHER */
                <div className="space-y-3">
                  {/* Stand Probability Status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-900">
                      {sharedStandProbability.standName}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-black text-[10px] rounded-full">
                      🎯 {sharedStandProbability.probabilityPercent}% Stand Availability
                    </span>
                  </div>

                  {/* Active Matched Carpool Banner (If Matched) */}
                  {selectedCarpool ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <strong className="text-emerald-950 font-black">
                            Carpool Matched with {selectedCarpool.hostName}
                          </strong>
                        </div>
                        <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          ₹{selectedCarpool.farePerSeat} / Seat
                        </span>
                      </div>

                      <div className="text-[11px] text-emerald-900 space-y-0.5">
                        <div>
                          📍 <strong>Meeting Point:</strong> {selectedCarpool.optimalMeetingPoint.name} ({selectedCarpool.optimalMeetingPoint.distanceMeters}m walk)
                        </div>
                        <div>
                          🕒 <strong>Meet At:</strong> {selectedCarpool.meetingTime} • {selectedCarpool.vehicleModel} (#{selectedCarpool.vehiclePlate})
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`tel:${selectedCarpool.hostPhone}`}
                          className="py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] text-center flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> Call Co-Rider
                        </a>

                        <button
                          type="button"
                          onClick={() => setShowCarpoolConfirmedModal(true)}
                          className="py-1.5 px-2 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-bold text-[11px] text-center"
                        >
                          View Meeting Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Smart Carpooling Matcher Prompt */
                    <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-purple-950 font-bold text-xs">
                          <Users className="w-3.5 h-3.5 text-purple-700" />
                          <span>Corridor Carpooling & Ride Match</span>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200 shadow-xs">
                          Save up to 80%
                        </span>
                      </div>

                      <p className="text-[11px] text-purple-900 leading-relaxed">
                        {matchingCarpools.length} verified co-riders heading along this same corridor around {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowCarpoolListModal(true)}
                          className="py-2 px-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <span>Browse Matches ({matchingCarpools.length})</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRaisePoolModal(true)}
                          className="py-2 px-2.5 bg-white hover:bg-purple-100/50 text-purple-900 border border-purple-300 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>+ Post Pool Request</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clean 3-Step Stand Progression */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">Board at {pickupLocationName}</strong>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          {sharedStandProbability.distanceMeters}m walk (~{sharedStandProbability.walkingMinutes} min)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">Corridor Flow: {sharedStandProbability.operatingRoute}</strong>
                        <span className="text-[10px] text-neutral-500 block">
                          ~{sharedStandProbability.availableVehiclesCount} autos waiting • Departs every {sharedStandProbability.averageHeadwayMinutes}m
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900 block">Arrive at {dropoffLocationName}</strong>
                        <span className="text-[10px] text-neutral-500">Fixed rate: {sharedStandProbability.fixedFareText}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Case 4: Public City Bus (Mo Bus Route 10 / Route 11) */
                <div className="space-y-3">
                  {/* Clean Telemetry Chip Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-black text-white font-black text-xs">
                        {matchedOfficialRoute.routeNumber}
                      </span>
                      <span className="font-bold text-neutral-800 text-xs">
                        #{actualVehiclePlate}
                      </span>
                    </div>
                    <span className="text-blue-800 bg-blue-50 font-bold px-2 py-0.5 rounded-md text-[11px] border border-blue-100">
                      {formattedBusArrivalTime} ({busWaitMinutes}m away)
                    </span>
                  </div>

                  {/* Clean Minimalist Route Progression Timeline */}
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-neutral-900">Board: {pickupLocationName}</strong>
                          <span className="text-emerald-700 font-semibold text-[10px]">
                            {walkToPickupDistanceMeters}m walk
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block">
                          {actualBusModel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="flex-1">
                        <strong className="text-neutral-900">
                          Ride {matchedOfficialRoute.originTerminus} ➡️ {matchedOfficialRoute.destTerminus}
                        </strong>
                        <span className="text-[10px] text-neutral-500 block">
                          {Math.max(5, (selectedRoute.duration || 15) - walkToPickupMinutes - finalWalkMinutes)} mins in-vehicle
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-neutral-900">Alight: {dropoffLocationName}</strong>
                          <span className="text-neutral-500 font-semibold text-[10px]">
                            {finalWalkDistanceMeters}m walk
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Official CRUT Mo Bus Fare Gazette Note */}
                  {selectedRoute?.fare && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-950 space-y-0.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          🏛️ Official CRUT Gazette Fare:
                        </span>
                        <span className="text-emerald-900 font-black text-xs">
                          ₹{selectedRoute.fare.exact}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-800 leading-tight">
                        {selectedRoute.fare.notes || selectedRoute.fare.source}
                      </p>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setShowWaysToReach(!showWaysToReach)}
                      className="text-blue-700 hover:text-blue-900 font-semibold underline flex items-center gap-1"
                    >
                      <span>Ways to Reach Stop ({waysToReachList.length})</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          showWaysToReach ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenTimetable(activeBoardingStop)}
                      className="text-neutral-900 hover:underline font-bold"
                    >
                      Live Stop Board →
                    </button>
                  </div>

                  {/* Expandable Ways to Reach Drawer */}
                  {showWaysToReach && (
                    <div className="space-y-1.5 p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px]">
                      {waysToReachList.map((way, wIdx) => (
                        <div
                          key={wIdx}
                          className="p-2 bg-white rounded-lg border border-neutral-100 flex items-start justify-between gap-2"
                        >
                          <div>
                            <strong className="text-neutral-900 block">{way.title}</strong>
                            <span className="text-[10px] text-neutral-500 block">
                              {way.description}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-neutral-800 text-[10px] block">
                              {way.durationMinutes} min
                            </span>
                            <span className="text-[9px] text-emerald-700 font-semibold">
                              {way.fareEstimate}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Big Clean Navigation CTA */}
          <Button
            size="lg"
            onClick={handleStart}
            className="w-full py-4 text-base font-black rounded-2xl bg-black hover:bg-neutral-800 text-white shadow-lg flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span>Start Live Navigation</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Collapsible Step-by-Step Directions */}
          <div className="pt-0.5">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span>
                {showSteps ? 'Hide' : 'View'} Turn-by-Turn ({selectedRoute?.turnByTurn?.length || 4} Steps)
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showSteps ? 'rotate-180' : ''}`}
              />
            </button>

            {showSteps && selectedRoute && (
              <div className="mt-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2 text-xs text-neutral-800">
                {(selectedRoute.turnByTurn && selectedRoute.turnByTurn.length > 0
                  ? selectedRoute.turnByTurn
                  : selectedRoute.segments.map((s) => `${s.type.toUpperCase()}: ${s.from} → ${s.to}`)
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

      {/* ========================================================================= */}
      {/* CARPOOL MATCHES MODAL (Corridor Co-Rider Search) */}
      {/* ========================================================================= */}
      <Modal
        open={showCarpoolListModal}
        onClose={() => setShowCarpoolListModal(false)}
        title="🚗 Matching Carpools & Co-Riders Along Your Route"
        size="lg"
      >
        <div className="space-y-3.5 text-xs font-sans">
          <p className="text-neutral-600 text-xs">
            These verified commuters are travelling along similar corridors around <strong>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>. Choose a ride to match and view the common meeting point.
          </p>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {matchingCarpools.map((pool) => (
              <div
                key={pool.id}
                className="p-4 bg-white border border-neutral-200 hover:border-purple-600 rounded-2xl transition-all space-y-3 shadow-xs"
              >
                {/* Top Host Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-900 font-black text-sm flex items-center justify-center shrink-0">
                      {pool.hostName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-sm font-bold text-neutral-900">{pool.hostName}</strong>
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          {pool.hostVerification}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block">
                        ⭐ {pool.hostRating} • {pool.hostRidesCount} pooled trips • {pool.vehicleModel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-emerald-800 block leading-tight">
                      ₹{pool.farePerSeat} <span className="text-xs font-normal text-neutral-500">/ seat</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Saves {pool.savingsPercent}% vs cab
                    </span>
                  </div>
                </div>

                {/* Corridor & Route Overlap Badge */}
                <div className="p-2.5 bg-neutral-50 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-purple-600" />
                      Corridor: {pool.routeCorridor}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-900 font-bold rounded-md text-[10px]">
                      🎯 {pool.corridorMatchPercent}% Match
                    </span>
                  </div>

                  {/* Common Meeting Point */}
                  <div className="flex items-start gap-1.5 text-neutral-700 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Common Meeting Point:</strong> {pool.optimalMeetingPoint.name} (~{pool.optimalMeetingPoint.distanceMeters}m walk, {pool.optimalMeetingPoint.walkingMinutes} min)
                      <span className="block text-[10px] text-neutral-500">{pool.optimalMeetingPoint.landmark}</span>
                    </div>
                  </div>
                </div>

                {/* Footer: Departure time, seats, and action button */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                  <div className="flex items-center gap-3 text-[11px] text-neutral-600">
                    <span>🕒 Leaves: <strong>{pool.scheduledDepartureTime}</strong></span>
                    <span>💺 <strong>{pool.availableSeats}</strong> of {pool.totalSeats} seats left</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAcceptCarpool(pool)}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4"
                  >
                    Match & Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                setShowCarpoolListModal(false);
                setShowRaisePoolModal(true);
              }}
              className="text-xs font-bold text-purple-700 hover:underline"
            >
              Can't find a match? Post a Pool Request →
            </button>

            <Button variant="secondary" size="sm" onClick={() => setShowCarpoolListModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* RAISE CARPOOL REQUEST MODAL */}
      {/* ========================================================================= */}
      <Modal
        open={showRaisePoolModal}
        onClose={() => setShowRaisePoolModal(false)}
        title="📢 Raise a Carpooling / Shared Ride Request"
        size="md"
      >
        <form onSubmit={handleRaisePoolSubmit} className="space-y-4 text-xs font-sans">
          <p className="text-neutral-600 text-xs">
            Decide your desired departure time. We will broadcast your request to commuters travelling in the same area along your route corridor.
          </p>

          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-neutral-900 font-bold">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedRoute?.originName || 'Origin'}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-900 font-bold">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>{selectedRoute?.destinationName || 'Destination'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-bold text-neutral-800 uppercase text-[10px]">
                Desired Departure Time
              </label>
              <input
                type="time"
                value={poolDepartTimeInput}
                onChange={(e) => setPoolDepartTimeInput(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-bold text-sm text-neutral-900 focus:border-black focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-neutral-800 uppercase text-[10px]">
                Seats Needed
              </label>
              <select
                value={poolSeatsInput}
                onChange={(e) => setPoolSeatsInput(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-bold text-xs text-neutral-900 focus:border-black focus:outline-none"
              >
                <option value={1}>1 Passenger (Single Seat)</option>
                <option value={2}>2 Passengers</option>
                <option value={3}>3 Passengers</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between gap-2">
            <div>
              <strong className="text-purple-950 block">Step-Free / Accessible Pool</strong>
              <span className="text-[10px] text-purple-800 block">Require folding wheelchair boot space or ground-level seating</span>
            </div>
            <input
              type="checkbox"
              checked={poolStepFreeInput}
              onChange={(e) => setPoolStepFreeInput(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setShowRaisePoolModal(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-purple-700 hover:bg-purple-800 text-white font-bold">
              Broadcast Pool Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRMED CARPOOL & COMMON MEETING POINT PASS MODAL */}
      {/* ========================================================================= */}
      {selectedCarpool && (
        <Modal
          open={showCarpoolConfirmedModal}
          onClose={() => setShowCarpoolConfirmedModal(false)}
          title="🤝 Carpool Matched & Meeting Point Pass"
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Top Success Banner */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
              <div>
                <strong className="text-emerald-950 block text-sm font-black">
                  Carpool Match Confirmed 🎉
                </strong>
                <span className="text-[11px] text-emerald-800">
                  You are paired with {selectedCarpool.hostName} ({selectedCarpool.hostVerification})
                </span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-900 block">
                  ₹{selectedCarpool.farePerSeat}
                </span>
                <span className="text-[10px] text-emerald-700">Split Fare</span>
              </div>
            </div>

            {/* Optimal Meeting Point Details */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md inline-block">
                📍 Common Meeting Location & Time
              </span>
              <h3 className="text-sm font-bold text-neutral-900">
                {selectedCarpool.optimalMeetingPoint.name}
              </h3>
              <p className="text-[11px] text-neutral-600">
                {selectedCarpool.optimalMeetingPoint.landmark}
              </p>

              <div className="flex items-center justify-between pt-1 text-xs border-t border-purple-200/70">
                <span className="font-bold text-neutral-900">
                  🕒 Meet at: <span className="text-purple-900 font-black">{selectedCarpool.meetingTime}</span>
                </span>
                <span className="text-purple-800 font-semibold">
                  ~{selectedCarpool.optimalMeetingPoint.distanceMeters}m walk ({selectedCarpool.optimalMeetingPoint.walkingMinutes} min)
                </span>
              </div>
            </div>

            {/* Co-Rider Vehicle Details */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Vehicle Info</span>
                <strong className="text-neutral-900 block">{selectedCarpool.vehicleModel}</strong>
                <span className="text-[10px] text-neutral-600 block">Plate #{selectedCarpool.vehiclePlate}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Co-Rider Rating</span>
                <span className="font-bold text-amber-600 flex items-center justify-end gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {selectedCarpool.hostRating}
                </span>
              </div>
            </div>

            {/* Direct Connect Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${selectedCarpool.hostPhone}`}
                className="py-3 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {selectedCarpool.hostName.split(' ')[0]}</span>
              </a>

              <a
                href={`https://api.whatsapp.com/send?phone=${selectedCarpool.hostPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
                  `Hi ${selectedCarpool.hostName}, I matched your carpool on Maarg Darshan! Meeting you at ${selectedCarpool.optimalMeetingPoint.name} at ${selectedCarpool.meetingTime}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Co-Rider</span>
              </a>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCarpoolConfirmedModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Live Stop Board Timetable Modal */}
      <Modal
        open={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        title={`🚏 Live Arrival Board — ${selectedTimetableStop?.name || activeBoardingStop.name}`}
        size="lg"
      >
        <div className="space-y-3 text-xs font-sans">
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-neutral-700 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900">
                {selectedTimetableStop?.bayNumber || activeBoardingStop.bayNumber}
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">♿ Low-Floor Ramp Certified</span>
            </div>
            <span className="text-neutral-500">
              Live: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {modalArrivals.map((bus, i) => (
              <div
                key={i}
                className="p-3 bg-white border border-neutral-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-neutral-400 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-black text-white rounded font-black text-xs">
                      {bus.routeNumber}
                    </span>
                    <strong className="text-neutral-900 text-xs">To {bus.destination}</strong>
                  </div>
                  <span className="text-[11px] text-neutral-500 block">
                    From {bus.originTerminus} • Vehicle #{bus.vehicleNumber}
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-sm font-black text-neutral-900 block leading-tight">
                      {bus.scheduledTime}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      in {bus.minutesAway} mins
                    </span>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-lg font-bold text-[10px] ${
                      bus.status === 'ARRIVING_NOW'
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : bus.status === 'DELAYED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-50 text-blue-800 border border-blue-100'
                    }`}
                  >
                    {bus.status === 'ARRIVING_NOW'
                      ? '⚡ Arriving'
                      : bus.status === 'DELAYED'
                      ? `+${bus.delayMinutes}m`
                      : 'On Time'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowTimetableModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fare Compare Modal */}
      <Modal
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="Compare Routes & Fares"
        size="md"
      >
        <div className="divide-y divide-neutral-100 text-xs">
          {searchResults.map((r, rIdx) => (
            <div
              key={r.route.id || rIdx}
              onClick={() => {
                setSelectedIndex(rIdx);
                setShowCompareModal(false);
              }}
              className="py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 px-2 rounded-xl"
            >
              <div>
                <span className="font-bold text-sm text-neutral-900 block">{r.route.name}</span>
                <span className="text-neutral-500 text-xs">
                  {r.duration} min • {r.walkingDistance}m walking •{' '}
                  {r.stairs === 0 ? '♿ Step-Free' : `${r.stairs} Stairs`}
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-base text-emerald-800 block">
                  {r.fare?.type === 'exact'
                    ? `₹${r.fare.exact}`
                    : `₹${r.fare?.min || 15} - ₹${r.fare?.max || 25}`}
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
