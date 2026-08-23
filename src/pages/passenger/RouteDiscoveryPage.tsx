import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Modal } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, ArrowRight, MapPin, Clock,
  ChevronRight, ExternalLink, ShieldCheck, CheckCircle2,
  Car, Bus, Train, Plane, RefreshCw, AlertCircle, Users,
  Plus, Check, X, Phone, UserCheck, Trash2, Sparkles, Share2,
  CreditCard, Ticket, Play, Pause, RotateCcw, FastForward
} from 'lucide-react';
import type { RouteSearchResult } from '../../types';
import {
  getMatchingCarpools,
  registerCarpoolRequest,
  cancelCarpoolRequest,
  getUserActiveCarpoolRequest,
  getUserActiveCarpoolRequests,
  acceptCarpoolRequest,
  type CarpoolRide,
} from '../../data/liveTimetable';

// Minimalist Endpoint Pins
const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-route-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2.5px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 13px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const originPin = createMapPin('#10b981', 'A');
const destPin = createMapPin('#ef4444', 'B');

// Transport Change / Transfer Mode Switch Badge Marker
const createTransferPin = (fromIcon: string, toIcon: string, label: string) =>
  L.divIcon({
    className: 'transfer-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="transfer-pulse-effect"></div>
        <div style="
          background: linear-gradient(135deg, #18181b, #09090b);
          color: white;
          border: 2px solid #f59e0b;
          border-radius: 20px;
          padding: 3px 9px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 800;
          font-size: 11px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.45);
          white-space: nowrap;
          z-index: 2;
          cursor: pointer;
        ">
          <span style="font-size: 13px;">${fromIcon}</span>
          <span style="color: #f59e0b; font-size: 12px; font-weight: 900;">➔</span>
          <span style="font-size: 13px;">${toIcon}</span>
          <span style="font-size: 10px; color: #fde68a; margin-left: 2px; font-weight: 700;">CHANGE</span>
        </div>
      </div>
    `,
    iconSize: [95, 30],
    iconAnchor: [47, 15],
  });

// Moving Animated Vehicle Tracer Marker
const createVehicleTracerPin = (icon: string, rotationDeg: number, label: string) =>
  L.divIcon({
    className: 'vehicle-tracer-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.25);
          animation: transferPulseRing 1.4s ease-out infinite;
        "></div>
        <div style="
          background: #0f172a;
          color: white;
          border: 2px solid #38bdf8;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          transform: rotate(${rotationDeg}deg);
          transition: transform 0.15s ease;
          z-index: 10;
        ">
          ${icon}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

// Auto-fit map viewport to continuous polyline so starting & ending points are clearly visible (especially for campus distances)
function MapBoundsController({ coordinates }: { coordinates: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 17,
          animate: true,
          duration: 0.6,
        });
      }
    }
  }, [coordinates, map]);
  return null;
}

// Transfer Point Interface
interface TransferChangePoint {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string;
  fromMode: string;
  toMode: string;
  fromIcon: string;
  toIcon: string;
  badgeLabel: string;
  description: string;
  hasRamp?: boolean;
}

// Compute precise Transport Change points along the route
function extractTransferChangePoints(route: RouteSearchResult): TransferChangePoint[] {
  const transfers: TransferChangePoint[] = [];
  if (!route) return transfers;

  const scope = route.travelScope || 'local';
  const vType = route.route?.vehicleType;
  const stops = route.intermediateStops || [];
  const geom = route.geometry;

  // 1. International Flights (Origin Airport Transfer + Layover Hub + Destination Airport Egress)
  if (scope === 'international') {
    if (stops.length >= 3) {
      transfers.push({
        id: 'transfer-intl-origin',
        latitude: stops[0].latitude,
        longitude: stops[0].longitude,
        locationName: stops[0].name,
        fromMode: 'Cab / Metro',
        toMode: 'International Flight',
        fromIcon: '🚖',
        toIcon: '✈️',
        badgeLabel: 'Airport Check-in',
        description: `Transfer from local cab to Flight Check-in & Security at ${stops[0].name}`,
        hasRamp: true,
      });

      transfers.push({
        id: 'transfer-intl-layover',
        latitude: stops[1].latitude,
        longitude: stops[1].longitude,
        locationName: stops[1].name,
        fromMode: 'Flight Leg 1',
        toMode: 'Connecting Flight Leg 2',
        fromIcon: '✈️',
        toIcon: '✈️',
        badgeLabel: 'Layover Interchange',
        description: `Aircraft change & transit security at Hub Airport ${stops[1].name}`,
        hasRamp: true,
      });

      transfers.push({
        id: 'transfer-intl-dest',
        latitude: stops[2].latitude,
        longitude: stops[2].longitude,
        locationName: stops[2].name,
        fromMode: 'International Flight',
        toMode: 'Destination Cab',
        fromIcon: '✈️',
        toIcon: '🚖',
        badgeLabel: 'Airport Exit & Cab',
        description: `Baggage claim exit & transfer to pre-booked destination cab at ${stops[2].name}`,
        hasRamp: true,
      });
    }
    return transfers;
  }

  // 2. Domestic Long-Distance Flight (Origin Airport Transfer + Destination Airport Egress)
  if (scope === 'domestic' && (vType === 'flight' || route.route?.id?.includes('AIR'))) {
    if (stops.length >= 2) {
      const isCarpool = route.route?.id?.includes('CARPOOL');
      transfers.push({
        id: 'transfer-air-origin',
        latitude: stops[0].latitude,
        longitude: stops[0].longitude,
        locationName: stops[0].name,
        fromMode: isCarpool ? 'Carpool Split' : 'Airport Cab',
        toMode: 'Domestic Flight',
        fromIcon: isCarpool ? '🚗' : '🚖',
        toIcon: '✈️',
        badgeLabel: 'Airport Boarding',
        description: `Alight from ${isCarpool ? 'Carpool' : 'Cab'} and proceed to Departure Terminal for ${route.transitChainInfo?.flightOrTrainNumber || 'Flight'}`,
        hasRamp: true,
      });

      transfers.push({
        id: 'transfer-air-dest',
        latitude: stops[1].latitude,
        longitude: stops[1].longitude,
        locationName: stops[1].name,
        fromMode: 'Domestic Flight',
        toMode: 'Destination Cab',
        fromIcon: '✈️',
        toIcon: '🚖',
        badgeLabel: 'Arrival Cab Transfer',
        description: `Alight from flight at ${stops[1].name} and connect with destination taxi`,
        hasRamp: true,
      });
    }
    return transfers;
  }

  // 3. Superfast & Vande Bharat Rail (Origin Station Transfer + Destination Station Egress)
  if (vType === 'train' || route.route?.id?.includes('RAIL') || route.route?.id?.includes('IRCTC')) {
    if (stops.length >= 2) {
      transfers.push({
        id: 'transfer-rail-origin',
        latitude: stops[0].latitude,
        longitude: stops[0].longitude,
        locationName: stops[0].name,
        fromMode: 'Station Cab',
        toMode: 'Superfast / Vande Bharat Train',
        fromIcon: '🚖',
        toIcon: '🚆',
        badgeLabel: 'Station Platform Transfer',
        description: `Alight cab at station porch & take ramp/elevator to platform for ${route.transitChainInfo?.flightOrTrainNumber || 'Train'}`,
        hasRamp: true,
      });

      transfers.push({
        id: 'transfer-rail-dest',
        latitude: stops[1].latitude,
        longitude: stops[1].longitude,
        locationName: stops[1].name,
        fromMode: 'Superfast Train',
        toMode: 'Destination Cab',
        fromIcon: '🚆',
        toIcon: '🚖',
        badgeLabel: 'Station Exit Transfer',
        description: `Alight train at ${stops[1].name} platform and transfer to taxi stand`,
        hasRamp: true,
      });
    }
    return transfers;
  }

  // 4. Urban Public Transit (Mo Bus Boarding & Alighting Stops)
  if (vType === 'bus') {
    if (stops.length >= 2) {
      transfers.push({
        id: 'transfer-bus-board',
        latitude: stops[0].latitude,
        longitude: stops[0].longitude,
        locationName: stops[0].name,
        fromMode: 'Sidewalk Walk',
        toMode: `Mo Bus ${route.route?.shortName || ''}`,
        fromIcon: '🚶',
        toIcon: '🚌',
        badgeLabel: 'Bus Boarding Stop',
        description: `Switch from walk to Mo Bus ${route.route?.shortName || ''} at ${stops[0].name} (Level boarding platform)`,
        hasRamp: stops[0].hasRamp,
      });

      transfers.push({
        id: 'transfer-bus-alight',
        latitude: stops[1].latitude,
        longitude: stops[1].longitude,
        locationName: stops[1].name,
        fromMode: `Mo Bus ${route.route?.shortName || ''}`,
        toMode: 'Walk to Final Address',
        fromIcon: '🚌',
        toIcon: '🚶',
        badgeLabel: 'Bus Alighting Stop',
        description: `Alight bus at ${stops[1].name} and walk final segment to destination`,
        hasRamp: stops[1].hasRamp,
      });
    }
    return transfers;
  }

  // 5. Shared Stand Taxi / Auto (Stand Boarding)
  if (route.route?.id?.includes('S1') || route.route?.id?.includes('CARPOOL')) {
    if (geom?.transitPath && geom.transitPath.length > 0) {
      const boardCoord = geom.transitPath[0];
      transfers.push({
        id: 'transfer-stand-board',
        latitude: boardCoord[0],
        longitude: boardCoord[1],
        locationName: 'Designated Corridor Meeting Point',
        fromMode: 'Walk',
        toMode: 'Shared Corridor Ride',
        fromIcon: '🚶',
        toIcon: '🚗',
        badgeLabel: 'Meeting Spot',
        description: 'Meet host/driver at designated accessible corridor pickup spot',
        hasRamp: true,
      });
    }
  }

  return transfers;
}

// Calculate bearing between two GPS coordinates in degrees
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function RouteDiscoveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, startJourney } = useAppStore();
  const { addToast } = useToast();
  const { searchResults, currentUser } = state;

  const urlTimeMode = searchParams.get('timeMode') || 'now';
  const urlDepartTime = searchParams.get('departTime') || '09:30';

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showSteps, setShowSteps] = useState<boolean>(true);

  // Carpooling States & Modals
  const [showCarpoolModal, setShowCarpoolModal] = useState<boolean>(false);
  const [showRaisePoolModal, setShowRaisePoolModal] = useState<boolean>(false);
  const [selectedCarpoolMatch, setSelectedCarpoolMatch] = useState<CarpoolRide | null>(null);
  const [carpoolRegistryVersion, setCarpoolRegistryVersion] = useState<number>(0);

  // Form Inputs
  const [poolRoleInput, setPoolRoleInput] = useState<'passenger_split' | 'driver'>('passenger_split');
  const [poolNameInput, setPoolNameInput] = useState<string>(currentUser?.name || 'Commuter');
  const [poolPhoneInput, setPoolPhoneInput] = useState<string>(currentUser?.phoneNumber || '+91 94370 12345');
  const [poolVehicleModelInput, setPoolVehicleModelInput] = useState<string>('Tata Nexon EV');
  const [poolVehiclePlateInput, setPoolVehiclePlateInput] = useState<string>('OD-02-AZ-8890');
  const [poolDepartTimeInput, setPoolDepartTimeInput] = useState<string>(urlDepartTime);
  const [poolSeatsInput, setPoolSeatsInput] = useState<number>(1);
  const [poolStepFreeInput, setPoolStepFreeInput] = useState<boolean>(false);
  const [poolNotesInput, setPoolNotesInput] = useState<string>('');

  // Route Animation Controller State (Disabled by default - only plays when user manually clicks Play)
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const [animProgressIndex, setAnimProgressIndex] = useState<number>(0);

  // Keep selected index valid
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(0);
    }
  }, [searchResults, selectedIndex]);

  const selectedRoute: RouteSearchResult = searchResults[selectedIndex] || searchResults[0];

  // Coordinates extraction
  const fullRouteArr: Array<[number, number]> = selectedRoute?.geometry?.fullRoute || [];
  const originCoords: [number, number] = [
    selectedRoute?.originCoords?.lat ?? (fullRouteArr[0] ? fullRouteArr[0][0] : 20.3555),
    selectedRoute?.originCoords?.lng ?? (fullRouteArr[0] ? fullRouteArr[0][1] : 85.8145),
  ];
  const destCoords: [number, number] = [
    selectedRoute?.destinationCoords?.lat ?? (fullRouteArr[fullRouteArr.length - 1] ? fullRouteArr[fullRouteArr.length - 1][0] : 20.3450),
    selectedRoute?.destinationCoords?.lng ?? (fullRouteArr[fullRouteArr.length - 1] ? fullRouteArr[fullRouteArr.length - 1][1] : 85.8180),
  ];

  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  // Ingress, Transit, and Egress geometries for multi-colored crisp rendering
  const ingressPath: Array<[number, number]> = selectedRoute?.geometry?.originToBoardWalk || [];
  const transitPath: Array<[number, number]> = selectedRoute?.geometry?.transitPath || continuousRoute;
  const egressPath: Array<[number, number]> = selectedRoute?.geometry?.alightToDestWalk || [];

  // Extract transfer points for transport change symbols
  const transferPoints = extractTransferChangePoints(selectedRoute);

  // Reset animation when changing routes (keep paused unless user plays)
  useEffect(() => {
    setAnimProgressIndex(0);
    setIsAnimationPlaying(false);
  }, [selectedIndex]);

  // Smooth Route Animation Interval
  useEffect(() => {
    if (!isAnimationPlaying || continuousRoute.length < 2) return;

    const intervalMs = Math.max(25, Math.round(75 / animSpeed));
    const timer = setInterval(() => {
      setAnimProgressIndex((prev) => {
        if (prev >= continuousRoute.length - 1) {
          return 0; // Loop seamlessly
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAnimationPlaying, animSpeed, continuousRoute.length]);

  // Calculate current animated vehicle position & mode icon
  const currentAnimCoord = continuousRoute[animProgressIndex] || originCoords;
  const nextAnimCoord = continuousRoute[Math.min(animProgressIndex + 1, continuousRoute.length - 1)] || currentAnimCoord;
  const currentBearing = calculateBearing(
    currentAnimCoord[0],
    currentAnimCoord[1],
    nextAnimCoord[0],
    nextAnimCoord[1]
  );

  // Determine current active vehicle icon based on progress fraction along legs
  const ingressLen = ingressPath.length;
  const transitLen = transitPath.length;
  const isFlight = selectedRoute?.route?.vehicleType === 'flight' || selectedRoute?.travelScope === 'international';
  const isTrain = selectedRoute?.route?.vehicleType === 'train';

  let currentVehicleIcon = '🚖';
  if (animProgressIndex < ingressLen && ingressLen > 0) {
    currentVehicleIcon = selectedRoute.route?.vehicleType === 'bus' ? '🚶' : '🚖';
  } else if (animProgressIndex < ingressLen + transitLen) {
    currentVehicleIcon = isFlight ? '✈️' : isTrain ? '🚆' : selectedRoute.route?.vehicleType === 'bus' ? '🚌' : '🚗';
  } else {
    currentVehicleIcon = selectedRoute.route?.vehicleType === 'bus' ? '🚶' : '🚖';
  }

  // Live Matching Carpools along this Corridor
  const matchingCarpools = getMatchingCarpools(
    originCoords[0],
    originCoords[1],
    destCoords[0],
    destCoords[1],
    urlDepartTime,
    currentUser?.id
  );

  // Active Applied Carpool Requests by Current User
  const [activeUserCarpools, setActiveUserCarpools] = useState<CarpoolRide[]>([]);

  const refreshActiveCarpools = useCallback(() => {
    const list = getUserActiveCarpoolRequests(currentUser?.id);
    setActiveUserCarpools(list);
  }, [currentUser?.id]);

  useEffect(() => {
    refreshActiveCarpools();
  }, [carpoolRegistryVersion, refreshActiveCarpools]);

  // Periodic Auto-Pruning every 15s to remove requests once arrival/expiry time has crossed
  useEffect(() => {
    const interval = setInterval(() => {
      refreshActiveCarpools();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshActiveCarpools]);

  // Listen for Live Acceptance Notifications
  useEffect(() => {
    const handleMatchEvent = (e: Event) => {
      const custom = e as CustomEvent;
      const detail = custom.detail;
      refreshActiveCarpools();
      setCarpoolRegistryVersion((v) => v + 1);

      addToast(
        'success',
        `🎉 Carpool Match Accepted! ${detail.partnerName} (${detail.partnerVehicle || 'Co-Rider'}) accepted your ride along ${detail.routeCorridor}!`,
        8000
      );
    };

    window.addEventListener('carpool_matched', handleMatchEvent);
    return () => window.removeEventListener('carpool_matched', handleMatchEvent);
  }, [addToast, refreshActiveCarpools]);

  const handleStart = () => {
    if (selectedRoute) {
      startJourney(selectedRoute);
      navigate(`/journey/${selectedRoute.route.id}`);
    }
  };

  // Open booking / external partner provider
  const handleBookExternal = () => {
    if (!selectedRoute) return;

    if (selectedRoute.transitChainInfo?.bookingUrl) {
      window.open(selectedRoute.transitChainInfo.bookingUrl, '_blank', 'noopener,noreferrer');
      addToast('info', `Opening ${selectedRoute.transitChainInfo.bookingService || 'Booking Portal'}...`, 3000);
      return;
    }

    const oLat = originCoords[0];
    const oLng = originCoords[1];
    const dLat = destCoords[0];
    const dLng = destCoords[1];
    const oName = encodeURIComponent(selectedRoute?.originName || 'Pickup');
    const dName = encodeURIComponent(selectedRoute?.destinationName || 'Destination');

    const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&pickup[formatted_address]=${oName}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}&dropoff[formatted_address]=${dName}`;
    window.open(uberUrl, '_blank', 'noopener,noreferrer');
    addToast('info', `Opening Uber for ${selectedRoute.originName} ➔ ${selectedRoute.destinationName}`, 3000);
  };

  const handleBookLegUrl = (url?: string, label?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      addToast('info', `Opening ${label || 'Booking Provider'}...`, 3000);
    }
  };

  // Carpool Match Accept
  const handleAcceptCarpool = (carpool: CarpoolRide) => {
    setSelectedCarpoolMatch(carpool);
    setShowCarpoolModal(false);
    addToast(
      'success',
      `🤝 Matched with ${carpool.hostName}! Meeting spot: ${carpool.optimalMeetingPoint.name} at ${carpool.meetingTime}.`
    );
  };

  // Raise Carpool Broadcast
  const handleRaisePoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = poolNameInput.trim() || currentUser?.name || 'Commuter';
    const cleanPhone = poolPhoneInput.trim() || currentUser?.phoneNumber || '+91 94370 12345';

    registerCarpoolRequest({
      userId: currentUser?.id || `usr-${Date.now()}`,
      userName: cleanName,
      userPhone: cleanPhone,
      role: poolRoleInput,
      vehicleModel: poolRoleInput === 'driver' ? (poolVehicleModelInput.trim() || 'Private Car') : undefined,
      vehiclePlate: poolRoleInput === 'driver' ? (poolVehiclePlateInput.trim() || 'OD-02-POOL') : undefined,
      originName: selectedRoute?.originName || 'Pickup Origin',
      originCoords,
      destinationName: selectedRoute?.destinationName || 'Destination',
      destinationCoords: destCoords,
      departTime: poolDepartTimeInput,
      seatsNeeded: poolSeatsInput,
      seatsOffered: poolSeatsInput,
      requiresStepFree: poolStepFreeInput,
      notes: poolNotesInput.trim(),
    });

    setShowRaisePoolModal(false);
    setCarpoolRegistryVersion((v) => v + 1);
    addToast(
      'success',
      `📢 Carpool request broadcasted under ${cleanName} for ${poolDepartTimeInput}! Matching co-riders along your corridor.`
    );
  };

  // Cancel Carpool Broadcast
  const handleCancelBroadcast = (requestId: string) => {
    cancelCarpoolRequest(requestId);
    if (selectedCarpoolMatch?.id === requestId) {
      setSelectedCarpoolMatch(null);
    }
    setCarpoolRegistryVersion((v) => v + 1);
    addToast('info', 'Your carpool request has been cancelled.');
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
  };

  const getModeIcon = (route: RouteSearchResult) => {
    const vType = route.route?.vehicleType;
    if (vType === 'flight' || route.travelScope === 'international') return <Plane className="w-4 h-4 text-sky-600" />;
    if (vType === 'train') return <Train className="w-4 h-4 text-blue-600" />;
    if (vType === 'bus') return <Bus className="w-4 h-4 text-emerald-600" />;
    if (route.route?.id?.includes('CARPOOL') || route.route?.name?.toLowerCase().includes('carpool') || route.route?.name?.toLowerCase().includes('sharing')) {
      return <Users className="w-4 h-4 text-purple-600" />;
    }
    return <Car className="w-4 h-4 text-amber-600" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 font-sans">
      {/* Top Header Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-900 font-bold overflow-hidden">
          <span className="truncate max-w-[180px] sm:max-w-[240px]">{selectedRoute?.originName || 'Origin'}</span>
          <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-[240px]">{selectedRoute?.destinationName || 'Destination'}</span>
          <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg shrink-0 ml-1">
            {urlTimeMode === 'now' ? '⚡ Leave Now' : `⏰ ${urlDepartTime || '09:30'}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Carpool Hub Action Button */}
          <button
            onClick={() => setShowCarpoolModal(true)}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Carpool Hub ({matchingCarpools.length} nearby)</span>
          </button>

          <button
            onClick={() => navigate('/plan')}
            className="text-xs font-bold text-neutral-700 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Change</span>
          </button>
        </div>
      </div>

      {/* Active Carpool Requests Section */}
      {activeUserCarpools.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Active Carpool Requests Applied ({activeUserCarpools.length})
            </span>
            <span className="text-[11px] text-neutral-500">Auto-expires after scheduled arrival</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {activeUserCarpools.map((pool) => {
              const isMatched = pool.status === 'matched';
              return (
                <div
                  key={pool.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isMatched
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                      : 'bg-purple-50/80 border-purple-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isMatched
                              ? 'bg-emerald-600 text-white'
                              : 'bg-purple-600 text-white animate-pulse'
                          }`}
                        >
                          {isMatched ? '✅ Match Accepted' : '⏳ Matching Co-Riders'}
                        </span>
                        <span className="text-xs font-bold text-neutral-900">
                          {pool.scheduledDepartureTime}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-neutral-800">
                        {pool.originName.split('(')[0]} ➔ {pool.destinationName.split('(')[0]}
                      </div>

                      {isMatched ? (
                        <div className="text-[11px] text-emerald-900 font-medium">
                          Matched with <strong>{pool.matchedWith || 'Co-Rider'}</strong> ({pool.matchedVehicle || 'Vehicle Verified'})
                        </div>
                      ) : (
                        <div className="text-[11px] text-purple-800">
                          Broadcasting to nearby verified students & commuters on this corridor...
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMatched && pool.matchedPhone && (
                        <a
                          href={`tel:${pool.matchedPhone}`}
                          className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleCancelBroadcast(pool.id)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 bg-white border border-red-200 px-2 py-1 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Left Column = Route Choices & Details; Right Column = Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Route Choices & Trip Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-600">
              Trip Itinerary Options ({searchResults.length})
            </h2>
            <span className="text-xs text-neutral-400 font-medium">Select to view path</span>
          </div>

          {/* Route Options List */}
          <div className="space-y-2.5">
            {searchResults.map((route, idx) => {
              const isSelected = selectedIndex === idx;
              const hasBreakdown = !!route.priceBreakdown;
              
              // Bulletproof Zero-Fare & Pricing Logic for EV, Walk, and transit
              const isZeroFare =
                route.route?.id?.includes('EV') ||
                route.route?.id?.includes('WALK') ||
                route.route?.id?.includes('STEP_FREE') ||
                route.route?.vehicleType === 'campus-vehicle' ||
                route.priceBreakdown?.totalPrice === 0 ||
                route.fare?.exact === 0;

              const isRouteCarpool =
                route.route?.id?.includes('CARPOOL') ||
                route.route?.name?.toLowerCase().includes('carpool') ||
                route.route?.name?.toLowerCase().includes('sharing');

              const isRouteCarpoolConfirmed =
                !!selectedCarpoolMatch ||
                activeUserCarpools.some((p) => p.status === 'matched' || p.status === 'confirmed');

              const displayTotalPrice = route.priceBreakdown?.totalPrice !== undefined
                ? route.priceBreakdown.totalPrice
                : route.fare?.exact;

              const fareDisplay = isZeroFare
                ? '₹0 Free'
                : isRouteCarpool && !isRouteCarpoolConfirmed
                ? 'Split on Match'
                : typeof displayTotalPrice === 'number'
                ? `₹${displayTotalPrice.toLocaleString()}`
                : route.fare?.min !== undefined && route.fare?.max !== undefined
                ? `₹${route.fare.min} - ₹${route.fare.max}`
                : '₹0 Free';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-black/10'
                      : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100'}`}>
                        {getModeIcon(route)}
                      </div>
                      <div>
                        <div className="font-bold text-sm leading-tight flex items-center gap-1.5 flex-wrap">
                          <span>{route.route?.name || 'Transit Option'}</span>
                          {route.transitChainInfo?.flightOrTrainNumber && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-800'}`}>
                              {route.transitChainInfo.flightOrTrainNumber.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {route.route?.description || 'Public Transport Corridor'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-sm">{formatDuration(route.duration)}</div>
                      <div className={`text-xs font-black ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {fareDisplay}
                      </div>
                      {hasBreakdown && (
                        <div className={`text-[10px] font-medium ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                          Total (Incl. Cabs)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-modal Legs Sequence Pills */}
                  {route.segments && route.segments.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-white/10 border-neutral-100 text-[11px] font-medium">
                      {route.segments.map((seg, sIdx) => (
                        <React.Fragment key={sIdx}>
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              isSelected ? 'bg-white/15 text-neutral-200' : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {seg.vehicleType === 'flight' || seg.routeId?.includes('FLIGHT') ? '✈️ Flight' :
                             seg.vehicleType === 'train' || seg.routeId?.includes('RAIL') ? '🚆 Train' :
                             seg.routeId?.includes('CARPOOL') || seg.routeName?.toLowerCase().includes('carpool') ? `🚗 Carpool` :
                             seg.type === 'walk' ? `🚶 ${seg.duration}m` :
                             seg.vehicleType === 'bus' ? `🚌 Bus` : `🚖 Cab`}
                          </span>
                          {sIdx < route.segments.length - 1 && (
                            <span className={isSelected ? 'text-neutral-400' : 'text-neutral-400'}>➔</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Route Action & Step Breakdown */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Selected Journey</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{selectedRoute.vehicleAccessible ? 'Step-Free / Accessible' : 'Standard Access'}</span>
              </span>
            </div>

            {/* Total Combined Price Card with Itemized Breakdown */}
            {selectedRoute.priceBreakdown && (() => {
              const isSelectedRouteCarpool =
                selectedRoute.route?.id?.includes('CARPOOL') ||
                selectedRoute.route?.name?.toLowerCase().includes('carpool') ||
                selectedRoute.route?.name?.toLowerCase().includes('sharing');

              const isSelectedCarpoolConfirmed =
                !!selectedCarpoolMatch ||
                activeUserCarpools.some((p) => p.status === 'matched' || p.status === 'confirmed');

              return (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Total Door-to-Door Journey Fare:</span>
                    </div>
                    <div className="text-base font-black text-emerald-700">
                      {selectedRoute.priceBreakdown.totalPrice === 0
                        ? '₹0 (Free)'
                        : isSelectedRouteCarpool && !isSelectedCarpoolConfirmed
                        ? 'Split on Match'
                        : `₹${selectedRoute.priceBreakdown.totalPrice.toLocaleString()}`}
                    </div>
                  </div>

                  {/* Itemized Fares Breakdown (Flight/Train + All Taxi Routes) */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-200/80 text-xs">
                    {selectedRoute.priceBreakdown.itemizedLegs.map((leg, lIdx) => (
                      <div key={lIdx} className="flex items-center justify-between py-1 bg-white px-2.5 rounded-xl border border-neutral-100">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <span className="shrink-0 text-sm">
                            {leg.mode === 'flight' ? '✈️' : leg.mode === 'train' ? '🚆' : leg.mode === 'carpool' ? '🚗' : leg.mode === 'bus' ? '🚌' : '🚖'}
                          </span>
                          <div className="truncate">
                            <div className="font-bold text-[11px] text-neutral-900 truncate">{leg.title}</div>
                            <div className="text-[10px] text-neutral-500 truncate">{leg.from.split('(')[0]} ➔ {leg.to.split('(')[0]}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-xs text-neutral-800">
                            {leg.mode === 'carpool' && !isSelectedCarpoolConfirmed
                              ? 'Split on Match'
                              : `₹${leg.fare.toLocaleString()}`}
                          </span>
                          {leg.mode === 'carpool' ? (
                            <button
                              type="button"
                              onClick={() => setShowRaisePoolModal(true)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm"
                            >
                              <Users className="w-2.5 h-2.5" />
                              <span>Raise Request</span>
                            </button>
                          ) : leg.bookingUrl ? (
                            <button
                              type="button"
                              onClick={() => handleBookLegUrl(leg.bookingUrl, leg.bookingLabel)}
                              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1"
                            >
                              <span>Book</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {isSelectedCarpoolConfirmed && selectedRoute.priceBreakdown.carpoolSplitSavings && (
                      <div className="flex items-center justify-between text-[11px] text-purple-700 font-bold px-1 pt-1">
                        <span>✨ Carpool Sharing Savings Applied:</span>
                        <span>-₹{selectedRoute.priceBreakdown.carpoolSplitSavings}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button
                onClick={handleStart}
                className="flex-1 py-3.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Live Navigation</span>
              </button>

              {selectedRoute.route?.id?.includes('CARPOOL') || selectedRoute.route?.name?.toLowerCase().includes('carpool') ? (
                <button
                  onClick={() => setShowRaisePoolModal(true)}
                  className="px-4 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-sm text-white transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>Raise Carpool Request</span>
                </button>
              ) : (
                <button
                  onClick={handleBookExternal}
                  className="px-4 py-3.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-bold text-sm text-neutral-800 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isFlight ? 'Book Flight' : isTrain ? 'Book IRCTC' : 'Book Ride'}</span>
                </button>
              )}
            </div>

            {/* Complete Turn-by-Turn Arrangement */}
            <div className="pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between text-xs font-bold text-neutral-700 py-1"
              >
                <span>Full Arrangement ({selectedRoute.turnByTurn?.length || selectedRoute.segments?.length || 3} legs)</span>
                <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${showSteps ? 'rotate-90' : ''}`} />
              </button>

              {showSteps && (
                <div className="mt-3 space-y-2.5 text-xs text-neutral-700">
                  {selectedRoute.turnByTurn && selectedRoute.turnByTurn.length > 0 ? (
                    selectedRoute.turnByTurn.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 font-medium leading-relaxed">{step}</div>
                      </div>
                    ))
                  ) : (
                    selectedRoute.segments?.map((seg, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 font-medium leading-relaxed">
                          {seg.type === 'walk' ? `Walk from ${seg.from} to ${seg.to} (${seg.distance || 100}m, ${seg.duration} min)` :
                           seg.vehicleType === 'flight' ? `Fly from ${seg.from} to ${seg.to} (~${seg.duration} min)` :
                           seg.vehicleType === 'train' ? `Ride train from ${seg.from} to ${seg.to} (~${seg.duration} min)` :
                           `Travel via ${seg.routeName || 'Cab'} from ${seg.from} to ${seg.to} (~${seg.duration} min)`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: High Precision Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 sticky top-4">
          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm h-[480px] sm:h-[620px] relative">
            <MapContainer
              center={originCoords}
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsController coordinates={continuousRoute} />

              {/* 1. Backdrop Casing Polyline for High Contrast & Sharp Clarity */}
              <Polyline
                positions={continuousRoute}
                pathOptions={{
                  color: '#0f172a',
                  weight: isFlight ? 6 : 7,
                  opacity: 0.3,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* 2. Distinct Leg 1: Ingress Road Path (Cab / Auto / Walk) */}
              {ingressPath.length > 0 && (
                <Polyline
                  positions={ingressPath}
                  pathOptions={{
                    color: selectedRoute.route?.vehicleType === 'bus' ? '#10b981' : '#d97706',
                    weight: 5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              {/* 3. Distinct Leg 2: Main Transit Corridor (Flight / Rail / Bus / Carpool) */}
              <Polyline
                positions={transitPath}
                pathOptions={{
                  color: isFlight ? '#0284c7' : isTrain ? '#1d4ed8' : selectedRoute.route?.vehicleType === 'bus' ? '#059669' : '#9333ea',
                  weight: isFlight ? 4 : 5,
                  opacity: 0.95,
                  dashArray: isFlight ? '12, 10' : undefined,
                  className: isFlight ? 'animated-flight-flow' : 'animated-route-flow',
                }}
              />

              {/* 4. Distinct Leg 3: Egress Road Path (Cab / Walk to Final Destination) */}
              {egressPath.length > 0 && (
                <Polyline
                  positions={egressPath}
                  pathOptions={{
                    color: selectedRoute.route?.vehicleType === 'bus' ? '#10b981' : '#d97706',
                    weight: 5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              {/* Origin Marker */}
              <Marker position={originCoords} icon={originPin}>
                <Popup>
                  <div className="text-xs font-bold p-1">
                    <div className="text-emerald-700 flex items-center gap-1">
                      <span>🟢 Journey Start (A)</span>
                    </div>
                    <div className="text-neutral-700 font-semibold mt-1">{selectedRoute.originName}</div>
                  </div>
                </Popup>
              </Marker>

              {/* 🔄 TRANSPORT CHANGE / TRANSFER SYMBOL MARKERS ON MAP */}
              {transferPoints.map((tp) => (
                <Marker
                  key={tp.id}
                  position={[tp.latitude, tp.longitude]}
                  icon={createTransferPin(tp.fromIcon, tp.toIcon, tp.badgeLabel)}
                >
                  <Popup>
                    <div className="text-xs space-y-1.5 p-1 min-w-[210px]">
                      <div className="flex items-center gap-1.5 text-amber-700 font-black">
                        <span>🔄 Transport Change Hub</span>
                      </div>
                      <div className="font-bold text-neutral-900 leading-snug">
                        {tp.locationName}
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] font-medium text-amber-900">
                        <div className="font-bold mb-0.5">
                          {tp.fromIcon} {tp.fromMode} ➔ {tp.toIcon} {tp.toMode}
                        </div>
                        <div>{tp.description}</div>
                      </div>
                      {tp.hasRamp && (
                        <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Certified Step-Free & Wheelchair Ramp Available</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Precise Animated Vehicle Tracer / Traveler Pulse */}
              <Marker
                position={currentAnimCoord}
                icon={createVehicleTracerPin(currentVehicleIcon, currentBearing, selectedRoute.route?.shortName || '')}
              >
                <Popup>
                  <div className="text-xs font-bold p-1">
                    <div>{currentVehicleIcon} Live Vehicle Simulation</div>
                    <div className="text-neutral-500 font-medium text-[11px]">
                      Traveling along {selectedRoute.route?.name || 'Route'}
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={destCoords} icon={destPin}>
                <Popup>
                  <div className="text-xs font-bold p-1">
                    <div className="text-red-600 flex items-center gap-1">
                      <span>🔴 Journey Destination (B)</span>
                    </div>
                    <div className="text-neutral-700 font-semibold mt-1">{selectedRoute.destinationName}</div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Floating Top Animation Controller */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-neutral-200 px-3 py-2 rounded-2xl shadow-lg text-xs font-bold text-neutral-800 flex items-center gap-2 z-[1000]">
              <button
                type="button"
                onClick={() => setIsAnimationPlaying(!isAnimationPlaying)}
                className={`p-1.5 rounded-xl transition-colors flex items-center gap-1 ${
                  isAnimationPlaying ? 'bg-black text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
                title={isAnimationPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {isAnimationPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-[11px] pr-0.5">{isAnimationPlaying ? 'Live Flow' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAnimProgressIndex(0)}
                className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                title="Restart Animation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setAnimSpeed(animSpeed === 1 ? 2 : animSpeed === 2 ? 4 : 1)}
                className="px-2 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-black"
                title="Change Speed"
              >
                {animSpeed}x
              </button>

              <div className="hidden sm:flex items-center gap-1.5 pl-1 text-[11px] text-neutral-500 font-medium border-l border-neutral-200">
                <span>{currentVehicleIcon}</span>
                <span>
                  {Math.round(((animProgressIndex + 1) / Math.max(1, continuousRoute.length)) * 100)}%
                </span>
              </div>
            </div>

            {/* Floating Bottom Legend */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-neutral-200 px-3.5 py-2 rounded-2xl shadow-lg text-[11px] font-bold text-neutral-800 flex flex-wrap items-center gap-3 z-[1000]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Origin (A)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>🔄 Transport Change Hub</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Transit Corridor</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Destination (B)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CARPOOLING & SHARED RIDES HUB MODAL
          ========================================================================= */}
      {showCarpoolModal && (
        <Modal
          open={showCarpoolModal}
          onClose={() => setShowCarpoolModal(false)}
          title="🚗 Carpooling & Shared Rides Hub"
        >
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Co-Riders on Your Corridor</h3>
                <p className="text-xs text-neutral-500">
                  {selectedRoute?.originName} ➔ {selectedRoute?.destinationName}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCarpoolModal(false);
                  setShowRaisePoolModal(true);
                }}
                className="text-xs font-bold text-white bg-black hover:bg-neutral-800 px-3 py-2 rounded-xl transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Offer / Request</span>
              </button>
            </div>

            {matchingCarpools.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {matchingCarpools.map((pool) => (
                  <div
                    key={pool.id}
                    className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 hover:bg-white transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                          <span>{pool.hostName}</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                            {pool.hostVerification}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {pool.vehicleModel} • {pool.role === 'driver' ? 'Offering Seats' : 'Splitting Cab/Auto'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-purple-700">₹{pool.farePerSeat}</div>
                        <div className="text-[10px] text-neutral-400 line-through">₹{pool.originalSoloFare}</div>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-700 bg-white p-2 rounded-xl border border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-medium text-[11px]">{pool.optimalMeetingPoint.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-neutral-500">
                        {pool.scheduledDepartureTime}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAcceptCarpool(pool)}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Request Seat / Match with {pool.hostName.split(' ')[0]}</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-neutral-50 border border-neutral-200 rounded-2xl space-y-2">
                <Users className="w-8 h-8 text-neutral-400 mx-auto" />
                <div className="text-xs font-bold text-neutral-800">No Co-Riders Currently on this Corridor</div>
                <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                  Be the first to post a carpool request for {urlDepartTime || '09:30 AM'} and commuters along your route will match with you!
                </p>
                <button
                  onClick={() => {
                    setShowCarpoolModal(false);
                    setShowRaisePoolModal(true);
                  }}
                  className="mt-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Carpool Request</span>
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =========================================================================
          RAISE / OFFER CARPOOL REQUEST MODAL
          ========================================================================= */}
      {showRaisePoolModal && (
        <Modal
          open={showRaisePoolModal}
          onClose={() => setShowRaisePoolModal(false)}
          title="📢 Offer or Request a Carpool"
        >
          <form onSubmit={handleRaisePoolSubmit} className="space-y-3.5 font-sans">
            {/* Role Selection */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPoolRoleInput('passenger_split')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    poolRoleInput === 'passenger_split'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                  }`}
                >
                  🙋 Passenger (Split Fare)
                </button>
                <button
                  type="button"
                  onClick={() => setPoolRoleInput('driver')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    poolRoleInput === 'driver'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                  }`}
                >
                  🚗 Driver (Offer Seats)
                </button>
              </div>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={poolNameInput}
                  onChange={(e) => setPoolNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={poolPhoneInput}
                  onChange={(e) => setPoolPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            {/* Vehicle details if Driver */}
            {poolRoleInput === 'driver' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-neutral-700 block mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={poolVehicleModelInput}
                    onChange={(e) => setPoolVehicleModelInput(e.target.value)}
                    placeholder="e.g. Tata Nexon EV"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-700 block mb-1">Vehicle Plate</label>
                  <input
                    type="text"
                    value={poolVehiclePlateInput}
                    onChange={(e) => setPoolVehiclePlateInput(e.target.value)}
                    placeholder="e.g. OD-02-AZ-8890"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            {/* Departure Time & Seats */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">Departure Time</label>
                <input
                  type="time"
                  value={poolDepartTimeInput}
                  onChange={(e) => setPoolDepartTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                  {poolRoleInput === 'driver' ? 'Available Seats' : 'Seats Needed'}
                </label>
                <select
                  value={poolSeatsInput}
                  onChange={(e) => setPoolSeatsInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:border-black cursor-pointer"
                >
                  <option value={1}>1 Seat</option>
                  <option value={2}>2 Seats</option>
                  <option value={3}>3 Seats</option>
                </select>
              </div>
            </div>

            {/* Accessibility / Boot Space */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="stepFreeCheck"
                checked={poolStepFreeInput}
                onChange={(e) => setPoolStepFreeInput(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 border-neutral-300 focus:ring-purple-500"
              />
              <label htmlFor="stepFreeCheck" className="text-xs font-medium text-neutral-700 cursor-pointer">
                Space for folding wheelchair or large luggage
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold text-neutral-700 block mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={poolNotesInput}
                onChange={(e) => setPoolNotesInput(e.target.value)}
                placeholder="e.g. Can meet at Campus Gate or KIIT Square"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRaisePoolModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Broadcast to Corridor
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
