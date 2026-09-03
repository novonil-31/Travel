import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Modal } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, ArrowRight, MapPin, Clock,
  ChevronRight, ExternalLink, ShieldCheck, CheckCircle2,
  Car, Bus, Train, Plane, RefreshCw, AlertCircle, Users,
  Plus, Check, X, Phone, UserCheck, Trash2, Sparkles, Share2,
  CreditCard, Ticket, Crosshair, Layers, Info
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
import { buildMakeMyTripBusUrl, extractCityForBooking, detectCorridorPopularity } from '../../utils/liveTransitPriceFetcher';
import {
  fetchAuthenticRouteRadar,
  type AuthenticVehicleRecord,
  type AuthenticRadarStatus,
} from '../../utils/liveTransitRadar';
import { LiveTransitRadarOverlay } from '../../components/map/LiveTransitRadarOverlay';
import { LiveTransitCountdownBanner } from '../../components/map/LiveTransitCountdownBanner';

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
const createTransferPin = (fromIcon: string, toIcon: string, _label?: string) =>
  L.divIcon({
    className: 'transfer-pin',
    html: `
      <div style="
        background: #000000;
        color: #ffffff;
        border: 1.5px solid #262626;
        border-radius: 9999px;
        padding: 2px 7px;
        display: flex;
        align-items: center;
        gap: 3px;
        font-weight: 800;
        font-size: 10px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        white-space: nowrap;
        cursor: pointer;
      ">
        <span style="font-size: 11px;">${fromIcon}</span>
        <span style="color: #ffffff; font-size: 9px; font-weight: 900;">➔</span>
        <span style="font-size: 11px;">${toIcon}</span>
      </div>
    `,
    iconSize: [60, 22],
    iconAnchor: [30, 11],
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

// Track zoom level dynamically to prevent congested markers when zoomed out
function MapZoomListener({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

// Ultra-High Definition Cartography & Satellite Layer Presets
const TILE_LAYERS = {
  voyager: {
    name: 'HD Vector',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  positron: {
    name: 'Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
};

function MapCustomControls({
  coordinates,
  mapStyle,
  setMapStyle,
  liveRadarEnabled,
  setLiveRadarEnabled,
  onRecenterOnBus,
}: {
  coordinates: Array<[number, number]>;
  mapStyle: 'voyager' | 'satellite' | 'positron';
  setMapStyle: (s: 'voyager' | 'satellite' | 'positron') => void;
  liveRadarEnabled: boolean;
  setLiveRadarEnabled: (enabled: boolean) => void;
  onRecenterOnBus?: () => void;
}) {
  const map = useMap();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleRecenter = () => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true, duration: 0.6 });
      }
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', zIndex: 1000, margin: '12px' }}>
      <div className="flex flex-col gap-2 items-end">
        {/* Map Layer Style & Live Radar Switcher */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-neutral-200/90 p-1 flex items-center gap-1 text-[11px] font-bold text-neutral-700">
          <button
            type="button"
            onClick={() => setLiveRadarEnabled(!liveRadarEnabled)}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              liveRadarEnabled
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'hover:bg-neutral-100 text-neutral-600'
            }`}
            title="Toggle Real-Time Vehicle Radar"
          >
            <span className={`w-2 h-2 rounded-full ${liveRadarEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-neutral-400'}`}></span>
            <span>🛰️ Radar</span>
          </button>
          <div className="w-[1px] h-4 bg-neutral-200" />
          <button
            type="button"
            onClick={() => setMapStyle('voyager')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${mapStyle === 'voyager'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            title="Ultra-Clear Vector HD Map"
          >
            🗺️ HD
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${mapStyle === 'satellite'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            title="Satellite Aerial Imagery"
          >
            🛰️ Sat
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('positron')}
            className={`px-2.5 py-1.5 rounded-xl transition-all ${mapStyle === 'positron'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'hover:bg-neutral-100 text-neutral-600'
              }`}
            title="Minimalist Light Map"
          >
            ⚪ Clean
          </button>
        </div>

        {/* Quick View Controls: Recenter, Bus Lock & Zoom */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-neutral-200/90 p-1 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleRecenter}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 text-neutral-700 transition-all"
            title="Recenter Map on Complete Route"
          >
            <Crosshair className="w-4 h-4 text-neutral-800" />
          </button>
          {liveRadarEnabled && onRecenterOnBus && (
            <button
              type="button"
              onClick={onRecenterOnBus}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-emerald-50 text-emerald-700 transition-all"
              title="Lock & Track Nearest Active Vehicle"
            >
              <Bus className="w-4 h-4 text-emerald-700" />
            </button>
          )}
          <div className="w-5 h-[1px] bg-neutral-200" />
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 text-neutral-800 font-black text-sm"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 text-neutral-800 font-black text-sm"
            title="Zoom Out"
          >
            &minus;
          </button>
        </div>
      </div>
    </div>
  );
}

// Check if an amount/fare is an estimated amount vs confirmed/exact
function isAmountEstimated(
  routeOrFare?: RouteSearchResult | { status?: string; confidence?: number; type?: string },
  leg?: { mode?: string; isEstimated?: boolean }
): boolean {
  if (leg) {
    if (leg.isEstimated !== undefined) return leg.isEstimated;
    if (leg.mode === 'taxi' || leg.mode === 'cab' || leg.mode === 'auto' || leg.mode === 'bike' || leg.mode === 'carpool') {
      return true;
    }
  }

  if (!routeOrFare) return false;

  const r = routeOrFare as RouteSearchResult;
  if (r.route) {
    const vType = String(r.route.vehicleType || '');
    if (vType === 'shared-transport' || vType.includes('taxi') || vType.includes('auto') || vType.includes('bike')) return true;
    if (r.route.id?.includes('AUTO') || r.route.id?.includes('BIKE') || r.route.id?.includes('CARPOOL')) return true;
    if (r.priceBreakdown?.ingressTaxiFare || r.priceBreakdown?.egressTaxiFare) return true;
    if (r.fare?.status === 'estimated' || r.fare?.type === 'range') return true;
    if (r.fare?.confidence !== undefined && r.fare.confidence < 0.95) return true;
    return r.fare?.status !== 'confirmed';
  }

  const f = routeOrFare as { status?: string; confidence?: number; type?: string };
  if (f.status === 'estimated' || f.type === 'range') return true;
  if (f.confidence !== undefined && f.confidence < 0.95) return true;

  return false;
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
    if (geom?.transitPath && geom.transitPath.length >= 2) {
      const origHubCoord = geom.transitPath[0];
      const destHubCoord = geom.transitPath[geom.transitPath.length - 1];
      const isCarpool = route.route?.id?.includes('CARPOOL');

      transfers.push({
        id: 'transfer-air-origin',
        latitude: origHubCoord[0],
        longitude: origHubCoord[1],
        locationName: route.transitChainInfo?.originHubName || 'Departure Airport',
        fromMode: isCarpool ? 'Carpool Split' : 'Airport Cab',
        toMode: 'Domestic Flight',
        fromIcon: isCarpool ? '🚗' : '🚖',
        toIcon: '✈️',
        badgeLabel: 'Cab ➔ Flight',
        description: `Transfer from ${isCarpool ? 'Carpool' : 'Cab'} to Flight at ${route.transitChainInfo?.originHubName || 'Airport'}`,
        hasRamp: true,
      });

      transfers.push({
        id: 'transfer-air-dest',
        latitude: destHubCoord[0],
        longitude: destHubCoord[1],
        locationName: route.transitChainInfo?.destHubName || 'Arrival Airport',
        fromMode: 'Domestic Flight',
        toMode: 'Destination Cab',
        fromIcon: '✈️',
        toIcon: '🚖',
        badgeLabel: 'Flight ➔ Cab',
        description: `Transfer from Flight to Destination Cab at ${route.transitChainInfo?.destHubName || 'Airport'}`,
        hasRamp: true,
      });
    }
    return transfers;
  }

  // 3. Superfast & Vande Bharat Rail (Origin Station Transfer + Destination Station Egress)
  if (vType === 'train' || route.route?.id?.includes('RAIL') || route.route?.id?.includes('IRCTC')) {
    if (geom?.transitPath && geom.transitPath.length >= 2) {
      const origHubCoord = geom.transitPath[0];
      const destHubCoord = geom.transitPath[geom.transitPath.length - 1];

      transfers.push({
        id: 'transfer-rail-origin',
        latitude: origHubCoord[0],
        longitude: origHubCoord[1],
        locationName: route.transitChainInfo?.originHubName || 'Boarding Railway Station',
        fromMode: 'Station Cab',
        toMode: 'Train',
        fromIcon: '🚖',
        toIcon: '🚆',
        badgeLabel: 'Cab ➔ Train',
        description: `Transfer from Station Cab to Train at ${route.transitChainInfo?.originHubName || 'Station'}`,
        hasRamp: true,
      });

      transfers.push({
        id: 'transfer-rail-dest',
        latitude: destHubCoord[0],
        longitude: destHubCoord[1],
        locationName: route.transitChainInfo?.destHubName || 'Arrival Railway Station',
        fromMode: 'Train',
        toMode: 'Destination Cab',
        fromIcon: '🚆',
        toIcon: '🚖',
        badgeLabel: 'Train ➔ Cab',
        description: `Transfer from Train to Destination Cab at ${route.transitChainInfo?.destHubName || 'Station'}`,
        hasRamp: true,
      });
    }
    return transfers;
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

  const [infoModalRoute, setInfoModalRoute] = useState<RouteSearchResult | null>(null);
  const [mapStyle, setMapStyle] = useState<'voyager' | 'satellite' | 'positron'>('voyager');
  const [currentMapZoom, setCurrentMapZoom] = useState<number>(12);
  const [selectedCoachClassOverrides, setSelectedCoachClassOverrides] = useState<Record<string, string>>({});

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

  const isFlight = selectedRoute?.route?.vehicleType === 'flight' || selectedRoute?.travelScope === 'international';
  const isTrain = selectedRoute?.route?.vehicleType === 'train';
  const isBus = selectedRoute?.route?.vehicleType === 'bus';

  // 🛰️ Authentic Transit Radar & Telemetry State (Zero Fabrication)
  const [liveRadarEnabled, setLiveRadarEnabled] = useState<boolean>(true);
  const [radarStatus, setRadarStatus] = useState<AuthenticRadarStatus>({
    hasLiveGps: false,
    activeVehicles: [],
    statusLabel: 'SCHEDULED_TIMETABLE_ONLY',
    sourceAttribution: 'Official Transit Schedule',
    crowdsourcedCount: 0,
  });

  // Fetch authentic telemetry from backend database & real crowdsourced reports
  const fetchLiveTelemetry = useCallback(async () => {
    if (!selectedRoute) return;
    const rId = selectedRoute.route?.shortName || selectedRoute.route?.id || 'BUS_10';
    const status = await fetchAuthenticRouteRadar(
      rId,
      originCoords[0],
      originCoords[1]
    );
    setRadarStatus(status);
  }, [selectedRoute, originCoords]);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry]);

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

  // Direct Redirect Booking Handler (MakeMyTrip / IRCTC / Uber)
  const handleDirectBooking = (mode: 'bus' | 'train' | 'flight' | 'cab', customFrom?: string, customTo?: string) => {
    const origStr = customFrom || selectedRoute?.transitChainInfo?.originHubName || selectedRoute?.originName || 'Bhubaneswar';
    const destStr = customTo || selectedRoute?.transitChainInfo?.destHubName || selectedRoute?.destinationName || 'Cuttack';
    const origCode = selectedRoute?.transitChainInfo?.originHubCode || selectedRoute?.originName?.split(',')[0] || 'BBS';
    const destCode = selectedRoute?.transitChainInfo?.destHubCode || selectedRoute?.destinationName?.split(',')[0] || 'NDLS';

    if (mode === 'bus' || isBus) {
      const srcCity = extractCityForBooking(origStr, 'Bhubaneswar');
      const dstCity = extractCityForBooking(destStr, 'Cuttack');
      const url = buildMakeMyTripBusUrl(origStr, destStr);
      window.open(url, '_blank', 'noopener,noreferrer');
      addToast('info', `🚌 Redirecting to MakeMyTrip Bus Booking (${srcCity} ➔ ${dstCity})...`, 3000);
      return;
    }

    if (mode === 'train' || isTrain) {
      const mmtUrl = `https://www.makemytrip.com/railways/listing?srcStn=${origCode}&destStn=${destCode}`;
      window.open(mmtUrl, '_blank', 'noopener,noreferrer');
      addToast('info', `🚆 Redirecting to MakeMyTrip Railways (${origCode} ➔ ${destCode})...`, 3000);
      return;
    }

    if (mode === 'flight' || isFlight) {
      const mmtUrl = selectedRoute?.transitChainInfo?.bookingUrl || `https://www.makemytrip.com/flight/search?itinerary=${origCode}-${destCode}`;
      window.open(mmtUrl, '_blank', 'noopener,noreferrer');
      addToast('info', `✈️ Redirecting to MakeMyTrip Flights (${origCode} ➔ ${destCode})...`, 3000);
      return;
    }

    // Cab / Auto / Rideshare
    const oLat = originCoords[0];
    const oLng = originCoords[1];
    const dLat = destCoords[0];
    const dLng = destCoords[1];
    const oName = encodeURIComponent(selectedRoute?.originName || 'Pickup');
    const dName = encodeURIComponent(selectedRoute?.destinationName || 'Destination');
    const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&pickup[formatted_address]=${oName}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}&dropoff[formatted_address]=${dName}`;
    window.open(uberUrl, '_blank', 'noopener,noreferrer');
    addToast('info', `🚖 Opening Uber Ride Booking...`, 3000);
  };

  // Open booking / external partner provider directly
  const handleBookExternal = () => {
    if (!selectedRoute) return;
    if (isTrain) handleDirectBooking('train');
    else if (isFlight) handleDirectBooking('flight');
    else if (isBus) handleDirectBooking('bus');
    else handleDirectBooking('cab');
  };

  const handleBookLegUrl = (url?: string, label?: string) => {
    if (label?.toLowerCase().includes('irctc') || label?.toLowerCase().includes('train') || isTrain) {
      const orig = selectedRoute?.transitChainInfo?.originHubCode || 'BBS';
      const dest = selectedRoute?.transitChainInfo?.destHubCode || 'NDLS';
      try {
        navigator.clipboard.writeText(`${orig} to ${dest}`);
      } catch (_) { }

      const mmtUrl = `https://www.makemytrip.com/railways/listing?srcStn=${orig}&destStn=${dest}`;
      window.open(mmtUrl, '_blank', 'noopener,noreferrer');
      addToast('info', `🚆 Opening IRCTC Train Booking (${orig} ➔ ${dest})`, 3500);
      return;
    }

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
                  className={`p-3.5 rounded-2xl border transition-all ${isMatched
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                      : 'bg-purple-50/80 border-purple-200 shadow-sm'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isMatched
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
        {/* Itinerary Column: Route Choices & Trip Breakdown (5 cols on desktop, 2nd order on mobile) */}
        <div className="order-2 lg:order-1 lg:col-span-5 space-y-4">
          {/* 🛰️ Live Transit Radar & Arrival Countdown Banner (Moovit / Transit App Grade) */}
          {/* 🛰️ Authentic Transit Radar & Telemetry Banner (Zero Fabrication) */}
          {selectedRoute && (
            <LiveTransitCountdownBanner
              routeNumber={selectedRoute.route?.shortName || selectedRoute.route?.id?.split('_')[0] || 'Transit'}
              routeName={selectedRoute.route?.name || 'Regional Corridor Route'}
              vehicleType={selectedRoute.route?.vehicleType || 'bus'}
              radarStatus={radarStatus}
              activeStopName={selectedRoute.originName || 'Your Boarding Station'}
              scheduledEtaMinutes={selectedRoute.eta || 10}
              scheduledDepartureTime={urlDepartTime}
              onRefreshRadar={fetchLiveTelemetry}
              onReportSubmitted={() => {
                addToast('success', '🌟 Ground-truth occupancy verified! Thank you for helping commuters.', 4000);
                fetchLiveTelemetry();
              }}
            />
          )}

          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-wider text-neutral-700">
              Available Rides & Routes ({searchResults.length})
            </h2>
            <span className="text-xs text-neutral-400 font-semibold">Tap to select</span>
          </div>

          {/* Clean Uber/Rapido-Style Vehicle Cards List */}
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

              const isRouteEstimated = isAmountEstimated(route);

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
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all select-none active:scale-[0.99] flex flex-col gap-2 ${isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-black/10'
                      : 'bg-white text-neutral-900 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-800'
                        }`}>
                        {getModeIcon(route)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm leading-tight truncate flex items-center gap-1.5">
                          <span className="truncate">{route.route?.name || 'Transit Option'}</span>
                          {route.transitChainInfo?.flightOrTrainNumber && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-800'}`}>
                              {route.transitChainInfo.flightOrTrainNumber.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {route.route?.vehicleType === 'campus-vehicle' || route.route?.id?.includes('EV')
                            ? '⚡ Free Campus Shuttle'
                            : route.route?.id?.includes('CARPOOL')
                              ? '🤝 Student Ride Sharing'
                              : route.route?.id?.includes('BIKE')
                                ? '🛵 Fast Solo Bike'
                                : route.route?.id?.includes('AUTO')
                                  ? '🚖 Direct Stand Auto'
                                  : route.route?.id?.includes('WALK') || route.route?.id?.includes('STEP_FREE')
                                    ? '🚶 Paved Sidewalk'
                                    : '🚌 Public Transit'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="font-black text-sm">{formatDuration(route.duration)}</div>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`text-xs font-black ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            {fareDisplay}
                          </span>
                          {isRouteEstimated && !isZeroFare && (!isRouteCarpool || isRouteCarpoolConfirmed) && (
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded leading-tight ${isSelected ? 'bg-white/20 text-neutral-200' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                              }`}>
                              Est.
                            </span>
                          )}
                        </div>
                        {route.priceBreakdown?.mainTicketFare && route.priceBreakdown.mainTicketFare !== displayTotalPrice && (
                          <div className={`text-[10px] font-bold leading-none mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            Ticket: ₹{route.priceBreakdown.mainTicketFare.toLocaleString()}{route.fare?.status === 'estimated' ? ' (Est.)' : ''}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoModalRoute(route);
                        }}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${isSelected
                            ? 'bg-white/20 text-white hover:bg-white/30'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black'
                          }`}
                        title="View Full Turn-by-Turn Arrangement"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-modal Legs Sequence Pills */}
                  {route.segments && route.segments.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-white/10 border-neutral-100 text-[11px] font-medium">
                      {route.segments.map((seg, sIdx) => (
                        <React.Fragment key={sIdx}>
                          <span
                            className={`px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/15 text-neutral-200' : 'bg-neutral-100 text-neutral-700'
                              }`}
                          >
                            {seg.vehicleType === 'flight' || seg.routeId?.includes('FLIGHT') ? '✈️ Flight' :
                              seg.vehicleType === 'train' || seg.routeId?.includes('RAIL') ? '🚆 Train' :
                                seg.routeId?.includes('CARPOOL') || seg.routeName?.toLowerCase().includes('carpool') ? `🚗 Carpool` :
                                  seg.type === 'walk' ? `🚶 ${seg.duration}m` :
                                    seg.vehicleType === 'bus' || seg.routeId?.includes('EV') ? (seg.routeId?.includes('EV') ? '⚡ EV' : '🚌 Bus') : `🚖 Cab`}
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

          {/* Selected Route Action & Step Breakdown (Docked Panel) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Selected Journey</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{selectedRoute.vehicleAccessible ? 'Step-Free / Accessible' : 'Standard Access'}</span>
              </span>
            </div>

            {/* Total Combined Price Card with Itemized Breakdown & Dynamic Coach Selector */}
            {selectedRoute.priceBreakdown && (() => {
              const isSelectedRouteCarpool =
                selectedRoute.route?.id?.includes('CARPOOL') ||
                selectedRoute.route?.name?.toLowerCase().includes('carpool') ||
                selectedRoute.route?.name?.toLowerCase().includes('sharing');

              const isSelectedCarpoolConfirmed =
                !!selectedCarpoolMatch ||
                activeUserCarpools.some((p) => p.status === 'matched' || p.status === 'confirmed');

              // Account preference & dynamic coach class resolution
              const userPreferredCoach = currentUser?.travelPreferences?.preferredTrainCoach || '3A';
              const availableTrainClasses = selectedRoute.transitChainInfo?.availableClasses || [
                { code: 'SL', name: 'Sleeper Class', fare: 685 },
                { code: '3A', name: 'AC 3 Tier', fare: 1810 },
                { code: '2A', name: 'AC 2 Tier', fare: 2640 },
                { code: '1A', name: 'AC 1st Class', fare: 4300 },
              ];

              const activeCoachCode = selectedCoachClassOverrides[selectedRoute.route.id] ||
                (availableTrainClasses.some((c) => c.code === userPreferredCoach)
                  ? userPreferredCoach
                  : availableTrainClasses[0]?.code || '3A');

              const activeCoachObj = availableTrainClasses.find((c) => c.code === activeCoachCode) || availableTrainClasses[0];
              const dynamicTrainFare = activeCoachObj?.fare || selectedRoute.priceBreakdown.mainTicketFare || 1810;

              const ingressFare = selectedRoute.priceBreakdown.ingressTaxiFare || 0;
              const egressFare = selectedRoute.priceBreakdown.egressTaxiFare || 0;

              const totalDynamicPrice = isTrain
                ? ingressFare + dynamicTrainFare + egressFare
                : selectedRoute.priceBreakdown.totalPrice;

              const isTotalEstimated = isAmountEstimated(selectedRoute);

              return (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Total Door-to-Door Journey Fare:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-emerald-700">
                        {totalDynamicPrice === 0
                          ? '₹0 (Free)'
                          : isSelectedRouteCarpool && !isSelectedCarpoolConfirmed
                            ? 'Split on Match'
                            : `₹${totalDynamicPrice.toLocaleString()}`}
                      </span>
                      {isTotalEstimated && totalDynamicPrice > 0 && (!isSelectedRouteCarpool || isSelectedCarpoolConfirmed) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-300">
                          Estimated
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Internet Demand & Popularity Status */}
                  {(() => {
                    const popularity = detectCorridorPopularity(selectedRoute?.originName || '', selectedRoute?.destinationName || '', searchParams.get('date') || undefined);
                    return (
                      <div className="flex items-center justify-between text-[11px] bg-white border border-neutral-200/90 px-2.5 py-1.5 rounded-xl font-medium shadow-2xs">
                        <div className="flex items-center gap-1.5 text-neutral-800">
                          <span className="text-xs">🌐</span>
                          <span><strong>Live Market Index:</strong> {popularity.demandStatus}</span>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                          {popularity.capacityNotice || 'Live Availability'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* On-The-Spot Train Coach Class Selector & Recommendation */}
                  {isTrain && (
                    <div className="bg-white border border-neutral-200 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-neutral-700 flex items-center gap-1">
                          <span>🚆</span>
                          <span>Coach Class Recommendation:</span>
                        </span>
                        <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md text-[10px]">
                          {activeCoachObj.name} (Spot Fare: ₹{dynamicTrainFare.toLocaleString()})
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {availableTrainClasses.map((cls) => {
                          const isSel = cls.code === activeCoachCode;
                          return (
                            <button
                              key={cls.code}
                              type="button"
                              onClick={() => setSelectedCoachClassOverrides((prev) => ({ ...prev, [selectedRoute.route.id]: cls.code }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isSel
                                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                }`}
                            >
                              <span>{cls.code}</span>
                              <span className={`ml-1 text-[10px] ${isSel ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                ₹{cls.fare.toLocaleString()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Itemized Fares Breakdown (Flight/Train + All Taxi Routes) */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-200/80 text-xs">
                    {selectedRoute.priceBreakdown.itemizedLegs.map((leg, lIdx) => {
                      const legFare = leg.mode === 'train' ? dynamicTrainFare : leg.fare;
                      const legTitle = leg.mode === 'train'
                        ? `${leg.title} [Coach: ${activeCoachCode}]`
                        : leg.title;
                      const isLegEstimated = isAmountEstimated(selectedRoute, leg);

                      return (
                        <div key={lIdx} className="flex items-center justify-between py-1 bg-white px-2.5 rounded-xl border border-neutral-100">
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <span className="shrink-0 text-sm">
                              {leg.mode === 'flight' ? '✈️' : leg.mode === 'train' ? '🚆' : leg.mode === 'carpool' ? '🚗' : leg.mode === 'bus' ? '🚌' : '🚖'}
                            </span>
                            <div className="truncate">
                              <div className="font-bold text-[11px] text-neutral-900 truncate">{legTitle}</div>
                              <div className="text-[10px] text-neutral-500 truncate">
                                {((leg.from || selectedRoute?.originName || 'Origin').split('(')[0] || 'Origin').trim()} ➔ {((leg.to || selectedRoute?.destinationName || 'Destination').split('(')[0] || 'Destination').trim()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-xs text-neutral-800">
                                {leg.mode === 'carpool' && !isSelectedCarpoolConfirmed
                                  ? 'Split on Match'
                                  : `₹${legFare.toLocaleString()}`}
                              </span>
                              {isLegEstimated && legFare > 0 && (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                  Est.
                                </span>
                              )}
                            </div>
                            {leg.mode === 'carpool' ? (
                              <button
                                type="button"
                                onClick={() => setShowRaisePoolModal(true)}
                                className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm"
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>Raise Request</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (leg.mode === 'train' || isTrain) handleDirectBooking('train', leg.from, leg.to);
                                  else if (leg.mode === 'flight' || isFlight) handleDirectBooking('flight', leg.from, leg.to);
                                  else if (leg.mode === 'bus' || isBus) handleDirectBooking('bus', leg.from, leg.to);
                                  else handleDirectBooking('cab', leg.from, leg.to);
                                }}
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <span>Book</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isSelectedCarpoolConfirmed && selectedRoute.priceBreakdown.carpoolSplitSavings && (
                      <div className="flex items-center justify-between text-[11px] text-purple-700 font-bold px-1 pt-1">
                        <span>✨ Carpool Sharing Savings Applied:</span>
                        <span>-₹${selectedRoute.priceBreakdown.carpoolSplitSavings}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleStart}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Live Navigation</span>
              </button>

              {selectedRoute.route?.id?.includes('CARPOOL') || selectedRoute.route?.name?.toLowerCase().includes('carpool') ? (
                <button
                  onClick={() => setShowRaisePoolModal(true)}
                  className="py-3 sm:py-3.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-sm text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-sm min-h-[44px]"
                >
                  <Users className="w-4 h-4" />
                  <span>Raise Carpool Request</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isTrain) handleDirectBooking('train');
                    else if (isFlight) handleDirectBooking('flight');
                    else if (isBus) handleDirectBooking('bus');
                    else handleDirectBooking('cab');
                  }}
                  className={`py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer shadow-sm ${isTrain ? 'bg-blue-700 hover:bg-blue-800' : isFlight ? 'bg-neutral-900 hover:bg-neutral-800' : isBus ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-neutral-900 hover:bg-neutral-800'
                    }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isTrain ? 'Book IRCTC Train' : isFlight ? 'Book Flight Ticket' : isBus ? 'Book Bus Ticket' : 'Book Ride'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Map Column: High Precision Leaflet Map (Top on mobile, Right 7 cols on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-7 sticky top-4">
          <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm h-[280px] sm:h-[380px] lg:h-[620px] relative">
            <MapContainer
              center={originCoords}
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
              scrollWheelZoom={false}
            >
              <TileLayer
                key={mapStyle}
                attribution={TILE_LAYERS[mapStyle].attribution}
                url={TILE_LAYERS[mapStyle].url}
                subdomains={TILE_LAYERS[mapStyle].subdomains}
                maxZoom={TILE_LAYERS[mapStyle].maxZoom}
              />

              <MapBoundsController coordinates={continuousRoute} />
              <MapZoomListener onZoomChange={setCurrentMapZoom} />
              <MapCustomControls
                coordinates={continuousRoute}
                mapStyle={mapStyle}
                setMapStyle={setMapStyle}
                liveRadarEnabled={liveRadarEnabled}
                setLiveRadarEnabled={setLiveRadarEnabled}
                onRecenterOnBus={() => {
                  if (radarStatus.activeVehicles.length > 0) {
                    addToast('info', `📍 Focused on verified vehicle ${radarStatus.activeVehicles[0].label}`, 3000);
                  } else {
                    addToast('info', 'ℹ️ No active transponder broadcasting on this corridor. Operating on scheduled timetable.', 3500);
                  }
                }}
              />

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

              {/* 🚉 REAL INTERMEDIATE TRANSIT STATIONS & AIRPORTS ON MAP (Progressive Dynamic Zoom Scaling) */}
              {selectedRoute.intermediateStops && selectedRoute.intermediateStops.map((stop, sIdx) => {
                const isTrainStop = isTrain || selectedRoute.route?.vehicleType === 'train';
                const isFlightStop = isFlight || selectedRoute.route?.vehicleType === 'flight';
                const stopIconEmoji = isTrainStop ? '🚆' : isFlightStop ? '✈️' : '🚏';
                const stopColor = isTrainStop ? '#1e40af' : isFlightStop ? '#0284c7' : '#059669';

                // Multi-Tier Zoom Scaling:
                // Zoom <= 5: Tiny 4px micro dot
                // Zoom 6-8: 6px micro dot
                // Zoom 9-10: 18px mini station badge
                // Zoom 11-13: 26px standard badge
                // Zoom 14-15: Large badge with station code pill
                // Zoom 16+: Prominent landmark station badge with name
                let pinHtml = '';
                let pinSize: [number, number] = [6, 6];
                let pinAnchor: [number, number] = [3, 3];

                if (currentMapZoom <= 5) {
                  pinHtml = `<div style="width:4px;height:4px;background:${stopColor};border:1px solid white;border-radius:9999px;"></div>`;
                  pinSize = [4, 4];
                  pinAnchor = [2, 2];
                } else if (currentMapZoom <= 8) {
                  pinHtml = `<div style="width:6px;height:6px;background:${stopColor};border:1.5px solid white;border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`;
                  pinSize = [6, 6];
                  pinAnchor = [3, 3];
                } else if (currentMapZoom <= 10) {
                  pinHtml = `<div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;background:${stopColor};color:white;border:1.5px solid white;border-radius:9999px;box-shadow:0 2px 4px rgba(0,0,0,0.3);font-size:9px;font-weight:bold;cursor:pointer;">${stopIconEmoji}</div>`;
                  pinSize = [18, 18];
                  pinAnchor = [9, 9];
                } else if (currentMapZoom <= 13) {
                  pinHtml = `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;background:${stopColor};color:white;border:2px solid white;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:12px;font-weight:bold;cursor:pointer;">${stopIconEmoji}</div>`;
                  pinSize = [26, 26];
                  pinAnchor = [13, 13];
                } else if (currentMapZoom <= 15) {
                  pinHtml = `<div style="display:flex;align-items:center;gap:4px;background:${stopColor};color:white;border:2px solid white;border-radius:20px;padding:3px 8px;box-shadow:0 3px 8px rgba(0,0,0,0.4);font-weight:bold;font-size:11px;white-space:nowrap;cursor:pointer;"><span style="font-size:13px;">${stopIconEmoji}</span><span>${stop.id}</span></div>`;
                  pinSize = [70, 26];
                  pinAnchor = [35, 13];
                } else {
                  // High zoom (>= 16)
                  pinHtml = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;"><div style="display:flex;align-items:center;gap:5px;background:${stopColor};color:white;border:2px solid white;border-radius:20px;padding:4px 10px;box-shadow:0 4px 10px rgba(0,0,0,0.45);font-weight:bold;font-size:12px;white-space:nowrap;"><span style="font-size:15px;">${stopIconEmoji}</span><span>${stop.name.split('(')[0]}</span></div>${stop.hasRamp ? '<div style="background:#10b981;color:white;font-size:9px;font-weight:bold;padding:1px 6px;border-radius:10px;margin-top:2px;border:1px solid white;">♿ RAMP</div>' : ''}</div>`;
                  pinSize = [120, 36];
                  pinAnchor = [60, 18];
                }

                const stationIcon = L.divIcon({
                  html: pinHtml,
                  className: 'custom-station-pin',
                  iconSize: pinSize,
                  iconAnchor: pinAnchor,
                });

                return (
                  <Marker
                    key={`station-stop-${stop.id}-${sIdx}`}
                    position={[stop.latitude, stop.longitude]}
                    icon={stationIcon}
                  >
                    <Popup>
                      <div className="text-xs space-y-1.5 p-1 min-w-[200px]">
                        <div className="flex items-center justify-between gap-1.5 font-bold" style={{ color: stopColor }}>
                          <span>{stopIconEmoji} {isTrainStop ? 'Railway Station' : isFlightStop ? 'Airport Hub' : 'Transit Stop'}</span>
                          <span className="text-[10px] bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded font-mono font-bold">Stop #{stop.sequence}</span>
                        </div>
                        <div className="font-bold text-neutral-900 leading-snug">
                          {stop.name}
                        </div>
                        {stop.hasRamp && (
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1 bg-emerald-50 px-2 py-1 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Step-Free Ramp & Platform Elevator</span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* 🛰️ REAL-TIME LIVE TRANSIT RADAR (Only authentic vehicles from telemetry/crowdsourcing) */}
              {liveRadarEnabled && radarStatus.activeVehicles.length > 0 && (
                <LiveTransitRadarOverlay
                  vehicles={radarStatus.activeVehicles}
                  onSelectVehicle={(v) => {
                    addToast('info', `📍 Live Vehicle: ${v.label} • Source: ${v.source}`, 3000);
                  }}
                />
              )}

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
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${poolRoleInput === 'passenger_split'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                >
                  🙋 Passenger (Split Fare)
                </button>
                <button
                  type="button"
                  onClick={() => setPoolRoleInput('driver')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${poolRoleInput === 'driver'
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

      {/* ℹ️ Dedicated Route Full Arrangement Modal */}
      {infoModalRoute && (
        <Modal
          open={!!infoModalRoute}
          onClose={() => setInfoModalRoute(null)}
          title={`ℹ️ ${infoModalRoute.route?.name || 'Ride Details'} - Full Arrangement`}
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Quick Summary Strip */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-neutral-900 text-xs">
                  {(infoModalRoute.originName || 'Origin').split('(')[0]} ➔ {(infoModalRoute.destinationName || 'Destination').split('(')[0]}
                </div>
                <div className="text-neutral-500 text-[11px]">
                  Estimated Duration: ~{formatDuration(infoModalRoute.duration)}
                </div>
              </div>
              <div className="text-right flex items-center gap-1.5 justify-end">
                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800">
                  {infoModalRoute.priceBreakdown?.totalPrice === 0
                    ? '₹0 Free'
                    : infoModalRoute.priceBreakdown?.totalPrice !== undefined
                      ? `₹${infoModalRoute.priceBreakdown.totalPrice.toLocaleString()}`
                      : infoModalRoute.fare?.exact !== undefined
                        ? `₹${infoModalRoute.fare.exact}`
                        : '₹0 Free'}
                </span>
                {isAmountEstimated(infoModalRoute) && (infoModalRoute.priceBreakdown?.totalPrice || infoModalRoute.fare?.exact) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-300">
                    Estimated
                  </span>
                )}
              </div>
            </div>

            {/* Accessibility / Step-Free Badge */}
            {infoModalRoute.vehicleAccessible && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-2.5 flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Step-Free & Wheelchair Certified Accessible Corridor</span>
              </div>
            )}

            {/* Step-by-Step Direction Legs */}
            <div className="space-y-2">
              <div className="font-black text-neutral-700 uppercase tracking-wider text-[11px]">
                Turn-by-Turn Arrangement ({infoModalRoute.turnByTurn?.length || infoModalRoute.segments?.length || 3} legs)
              </div>

              <div className="space-y-2 bg-neutral-50/60 rounded-2xl p-3 border border-neutral-200/80 max-h-[260px] overflow-y-auto scrollbar-thin">
                {infoModalRoute.turnByTurn && infoModalRoute.turnByTurn.length > 0 ? (
                  infoModalRoute.turnByTurn.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1 font-medium text-neutral-800 leading-relaxed text-xs">{step}</div>
                    </div>
                  ))
                ) : (
                  infoModalRoute.segments?.map((seg, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1 font-medium text-neutral-800 leading-relaxed text-xs">
                        {seg.type === 'walk' ? `Walk from ${seg.from} to ${seg.to} (${seg.distance || 100}m, ${seg.duration} min)` :
                          seg.vehicleType === 'flight' ? `Fly from ${seg.from} to ${seg.to} (~${seg.duration} min)` :
                            seg.vehicleType === 'train' ? `Ride train from ${seg.from} to ${seg.to} (~${seg.duration} min)` :
                              `Travel via ${seg.routeName || 'Cab'} from ${seg.from} to ${seg.to} (~${seg.duration} min)`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="primary"
                className="flex-1 py-2.5 text-xs font-bold"
                onClick={() => {
                  const foundIdx = searchResults.findIndex((r) => r.route?.id === infoModalRoute.route?.id);
                  if (foundIdx >= 0) setSelectedIndex(foundIdx);
                  setInfoModalRoute(null);
                }}
              >
                Select This Ride
              </Button>
              <Button
                variant="outline"
                className="px-4 py-2.5 text-xs font-bold"
                onClick={() => setInfoModalRoute(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
