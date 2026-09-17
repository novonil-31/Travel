import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  CreditCard, Ticket, Crosshair, Layers, Info, Search, ArrowLeftRight,
  Footprints, Bike, Zap, TramFront
} from 'lucide-react';
import type { RouteSearchResult } from '../../types';
import { journeysApi, stopsApi } from '../../api';
import { useUserLocation } from '../../hooks/useUserLocation';
import {
  getMatchingCarpools,
  registerCarpoolRequest,
  cancelCarpoolRequest,
  getUserActiveCarpoolRequest,
  getUserActiveCarpoolRequests,
  acceptCarpoolRequest,
  syncCarpoolRegistryWithBackend,
  type CarpoolRide,
} from '../../data/liveTimetable';
import { buildMakeMyTripBusUrl, extractCityForBooking, detectCorridorPopularity } from '../../utils/liveTransitPriceFetcher';
import {
  fetchAuthenticRouteRadar,
  type AuthenticVehicleRecord,
  type AuthenticRadarStatus,
} from '../../utils/liveTransitRadar';
import { calculateDistanceKm } from '../../utils/userLocationService';
import { LiveTransitRadarOverlay } from '../../components/map/LiveTransitRadarOverlay';
import { LiveCabPriceComparator } from '../../components/LiveCabPriceComparator';
import { sanitizeAndStitchJourneyGeometry, buildExactTrainBookingUrl, buildExactFlightBookingUrl, buildExactBusBookingUrl } from '../../utils/onlineRouting';
import { getRouteTransportInfo, type RouteTransportInfo, type TransportType } from '../../utils/transportCategory';
import { evaluateBestAndCheapestOptions, calculateDynamicCrowding, calculateDynamicTariff } from '../../utils/dynamicCalculationEngine';
import {
  launchMobileAppOrWeb,
  buildTrainAppDeepLink,
  buildBusAppDeepLink,
  buildFlightAppDeepLink,
} from '../../utils/mobileAppLauncher';

// Modern High-Clarity Circular Journey Endpoint Pin (Prevents Overlap with nearby Station Badges)
const createEndpointPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-endpoint-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2.5px solid white;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 13px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        cursor: pointer;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const originPin = createEndpointPin('#10b981', 'A');
const destPin = createEndpointPin('#ef4444', 'B');

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

// Force Leaflet to recalculate container dimensions whenever mobile map view is activated or screen resizes
function MapMobileResizer({ isActive }: { isActive: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (isActive) {
      // Invalidate sequentially to ensure zero tile-clipping after CSS tab transition
      map.invalidateSize();
      const t1 = setTimeout(() => map.invalidateSize(), 50);
      const t2 = setTimeout(() => map.invalidateSize(), 200);
      const t3 = setTimeout(() => map.invalidateSize(), 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isActive, map]);

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [map]);

  return null;
}

// Auto-fit map viewport to continuous polyline smoothly without jarring resets on background telemetry
function MapBoundsController({
  coordinates,
  forceRecenter,
}: {
  coordinates: Array<[number, number]>;
  forceRecenter?: boolean;
}) {
  const map = useMap();
  const lastBoundsKeyRef = useRef<string>('');

  useEffect(() => {
    if (coordinates && coordinates.length >= 2) {
      const start = coordinates[0];
      const end = coordinates[coordinates.length - 1];
      const key = `${start[0].toFixed(4)},${start[1].toFixed(4)}_${end[0].toFixed(4)},${end[1].toFixed(4)}_${coordinates.length}`;
      if (key !== lastBoundsKeyRef.current || forceRecenter) {
        lastBoundsKeyRef.current = key;
        try {
          const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [40, 40],
              maxZoom: 17,
              animate: true,
              duration: 0.5,
            });
          }
        } catch {
          // ignore bounds calculation error
        }
      }
    }
  }, [coordinates, map, forceRecenter]);
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

// Minimalist Map Controls (Clean & Uncluttered for Mobile & Desktop)
function MapCustomControls({
  coordinates,
  mapType,
  setMapType,
}: {
  coordinates: Array<[number, number]>;
  mapType: 'streets' | 'satellite' | 'terrain';
  setMapType: (t: 'streets' | 'satellite' | 'terrain') => void;
}) {
  const map = useMap();

  const handleRecenter = () => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true, duration: 0.5 });
      }
    }
  };

  return (
    <>
      {/* Bottom-Left: Clean Google Maps Style Layer Switcher (Avoids overlap with top navigation card, especially on mobile) */}
      <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'auto', zIndex: 1000, margin: '12px' }}>
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-neutral-200 p-0.5 flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold text-neutral-700">
          <button
            type="button"
            onClick={() => setMapType('streets')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'streets'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
            title="Google Maps Street View"
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'satellite'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
            title="Google Maps Hybrid Satellite (Aerial + Street Names)"
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapType('terrain')}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'terrain'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
            title="Google Maps Topo / Relief"
          >
            ⛰️ Terrain
          </button>
        </div>
      </div>

      {/* Bottom-Right: Dedicated Recenter Crosshair (Google Maps style bottom-right positioning) */}
      <div className="leaflet-bottom leaflet-right" style={{ pointerEvents: 'auto', zIndex: 1000, margin: '14px' }}>
        <button
          type="button"
          onClick={handleRecenter}
          className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 text-neutral-700 transition-all cursor-pointer active:scale-95"
          title="Recenter Map on Route"
        >
          <Crosshair className="w-4 h-4 text-neutral-800" />
        </button>
      </div>
    </>
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

  // 4. Connecting Multi-Bus Transit (Bus Leg 1 ➔ Transfer Interchange ➔ Bus Leg 2)
  if (route.transfers && route.transfers > 0 && stops.length >= 3) {
    const transferStop = stops[1];
    transfers.push({
      id: `transfer-bus-${transferStop.id}`,
      latitude: transferStop.latitude,
      longitude: transferStop.longitude,
      locationName: transferStop.name,
      fromMode: 'Bus Line 1',
      toMode: 'Connecting Bus Line 2',
      fromIcon: '🚌',
      toIcon: '🚌',
      badgeLabel: 'Bus ➔ Bus Transfer',
      description: `Alight from initial bus and board connecting service at ${transferStop.name} (Step-free platform)`,
      hasRamp: transferStop.hasRamp ?? true,
    });
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
  const { state, startJourney, setSearchResults } = useAppStore();
  const { addToast } = useToast();
  const { searchResults, currentUser } = state;
  const { userLocation, isLocating: isGpsLocating, requestLocation } = useUserLocation();

  const urlOrigin = searchParams.get('origin');
  const urlDest = searchParams.get('destination');
  const urlOriginLat = searchParams.get('originLat') ? parseFloat(searchParams.get('originLat')!) : undefined;
  const urlOriginLng = searchParams.get('originLng') ? parseFloat(searchParams.get('originLng')!) : undefined;
  const urlDestLat = searchParams.get('destLat') ? parseFloat(searchParams.get('destLat')!) : undefined;
  const urlDestLng = searchParams.get('destLng') ? parseFloat(searchParams.get('destLng')!) : undefined;
  const urlMobility = searchParams.get('mobility') || 'none';

  const urlTimeMode = searchParams.get('timeMode') || 'now';
  const urlDepartTime = searchParams.get('departTime') || '';
  const urlDate = searchParams.get('date') || searchParams.get('departDate') || '';

  const [travelDate, setTravelDate] = useState<string>(
    urlDate || new Date().toISOString().split('T')[0]
  );
  const [mapType, setMapType] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [showRouteOverview, setShowRouteOverview] = useState<boolean>(false);
  const [showRideDispatchModal, setShowRideDispatchModal] = useState<boolean>(false);
  const [dispatchCategory, setDispatchCategory] = useState<'all' | 'cab' | 'auto' | 'bike' | 'carpool'>('all');

  const openRideComparator = (category: 'all' | 'cab' | 'auto' | 'bike' | 'carpool' = 'all') => {
    setDispatchCategory(category);
    setShowRideDispatchModal(true);
  };

  const selectedRoute: RouteSearchResult = searchResults[selectedIndex] || searchResults[0];

  // 🤖 Autonomous Multi-Criteria Vehicle Evaluation (Best / Cheapest / Fastest / Step-free)
  const vehicleRecommendations = useMemo(() => {
    return evaluateBestAndCheapestOptions(searchResults);
  }, [searchResults]);

  // 🧭 Compute clean, Google-Maps-style next navigation instruction without congesting the map
  const nextActionInfo = useMemo(() => {
    if (!selectedRoute) {
      return {
        icon: '📍',
        iconBg: 'bg-neutral-100 text-neutral-800 border-neutral-300',
        action: 'Select a Route',
        detail: 'Ready to navigate',
        fareLabel: '₹0',
      };
    }
    const rId = selectedRoute.route?.id || '';
    const isWalkOnly = rId === 'CAMPUS_STEP_FREE_WALK' || (selectedRoute.route?.vehicleType as string) === 'foot' || (selectedRoute.route?.vehicleType as string) === 'walk';
    const isCycle = rId === 'CAMPUS_SMART_CYCLE';
    const isEvShuttle = selectedRoute.route?.vehicleType === 'campus-vehicle';
    const isSharedRide = selectedRoute.route?.vehicleType === 'shared-transport';
    const isCarpool = rId.includes('CARPOOL') || selectedRoute.route?.name?.toLowerCase().includes('carpool');
    const isBikeTaxi = rId.includes('BIKE');

    if (isWalkOnly) {
      return {
        icon: '🚶',
        iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        action: 'Walk via Campus Footpath',
        detail: `${selectedRoute.walkingDistance || 400}m • ${selectedRoute.duration} mins • Step-free paved track`,
        fareLabel: 'Pedestrian (₹0)',
      };
    }
    if (isCycle) {
      return {
        icon: '🚲',
        iconBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        action: 'Ride Campus Smart Cycle',
        detail: `${selectedRoute.duration} mins • 0 wait • Student cycle hub`,
        fareLabel: 'Public Cycle',
      };
    }
    if (isEvShuttle) {
      return {
        icon: '⚡',
        iconBg: 'bg-teal-100 text-teal-800 border-teal-300',
        action: 'Take KIIT Eco EV Shuttle',
        detail: `${selectedRoute.duration} mins • Campus Stand • Departs every 5-8m`,
        fareLabel: '₹10 Standard',
      };
    }
    if (isCarpool) {
      return {
        icon: '🤝',
        iconBg: 'bg-purple-100 text-purple-800 border-purple-300',
        action: 'Student Carpool Split',
        detail: `${selectedRoute.duration} mins • Co-rider pickup at Campus Gate`,
        fareLabel: '₹15 split',
      };
    }
    if (isBikeTaxi) {
      return {
        icon: '🏍️',
        iconBg: 'bg-amber-100 text-amber-800 border-amber-300',
        action: 'Campus Bike Taxi',
        detail: `${selectedRoute.duration} mins • Direct ride to destination`,
        fareLabel: `₹${selectedRoute.fare?.exact || 25}`,
      };
    }
    if (isSharedRide) {
      return {
        icon: '🚖',
        iconBg: 'bg-amber-100 text-amber-800 border-amber-300',
        action: `Campus Auto (${selectedRoute.route.shortName})`,
        detail: `${selectedRoute.duration} mins • Direct ride to destination`,
        fareLabel: `₹${selectedRoute.fare?.exact || 30}`,
      };
    }

    // Transit Bus / Rail / Flight
    const isTrainRoute = selectedRoute.route?.vehicleType === 'train';
    const isFlightRoute = selectedRoute.route?.vehicleType === 'flight';
    const boardStop = selectedRoute.intermediateStops?.[0]?.name?.split('(')[0]?.trim() || 'Campus Gate';
    const alightStop = selectedRoute.intermediateStops && selectedRoute.intermediateStops.length > 0
      ? selectedRoute.intermediateStops[selectedRoute.intermediateStops.length - 1]?.name?.split('(')[0]?.trim() || 'Destination'
      : 'Destination';
    const hasTransfer = selectedRoute.transfers > 0 && selectedRoute.intermediateStops && selectedRoute.intermediateStops.length > 2;
    const transferStop = hasTransfer && selectedRoute.intermediateStops ? selectedRoute.intermediateStops[1]?.name?.split('(')[0]?.trim() : null;

    if (hasTransfer && transferStop) {
      return {
        icon: '🔄',
        iconBg: 'bg-amber-100 text-amber-900 border-amber-300',
        action: `Board Bus ${selectedRoute.route.shortName} ➔ Transfer at ${transferStop}`,
        detail: `Then connect to ${alightStop} • Total ${selectedRoute.duration}m`,
        fareLabel: `₹${selectedRoute.fare?.exact || 25}`,
      };
    }

    return {
      icon: isTrainRoute ? '🚆' : isFlightRoute ? '✈️' : '🚏',
      iconBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      action: isTrainRoute
        ? `Board Train at ${boardStop}`
        : isFlightRoute
        ? `Fly from ${boardStop}`
        : `Walk ${selectedRoute.walkingDistance || 120}m ➔ Board Bus ${selectedRoute.route.shortName} at ${boardStop}`,
      detail: `Alight at ${alightStop} • ${selectedRoute.duration} mins total`,
      fareLabel: `₹${selectedRoute.fare?.exact || 15}`,
    };
  }, [selectedRoute]);

  // Interactive Search States
  const [originInput, setOriginInput] = useState<string>(urlOrigin || '');
  const [destInput, setDestInput] = useState<string>(urlDest || '');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | null>(null);
  const [isSearchingRoute, setIsSearchingRoute] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'routes' | 'map'>('routes');

  // Synchronize inputs if URL changes
  useEffect(() => {
    if (urlOrigin) setOriginInput(urlOrigin);
    else if (selectedRoute?.originName) setOriginInput(selectedRoute.originName);
    else if (userLocation?.placeName && !originInput) setOriginInput(userLocation.placeName);
  }, [urlOrigin, selectedRoute?.originName, userLocation?.placeName]);

  useEffect(() => {
    if (urlDest) setDestInput(urlDest);
    else if (selectedRoute?.destinationName) setDestInput(selectedRoute.destinationName);
  }, [urlDest, selectedRoute?.destinationName]);

  // Autocomplete debounced listeners (with user GPS proximity bias)
  useEffect(() => {
    if (!originInput || activeDropdown !== 'origin') {
      setOriginSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const places = await stopsApi.searchPlaces(originInput, userLocation);
        setOriginSuggestions(places);
      } catch (err) {
        console.error('Origin search error:', err);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [originInput, activeDropdown, userLocation]);

  useEffect(() => {
    if (!destInput || activeDropdown !== 'dest') {
      setDestSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const places = await stopsApi.searchPlaces(destInput, userLocation);
        setDestSuggestions(places);
      } catch (err) {
        console.error('Dest search error:', err);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [destInput, activeDropdown, userLocation]);

  // Execute Dynamic Route Search
  const handleExecuteSearch = async (
    fromText: string,
    toText: string,
    explicitOrigin?: { lat: number; lng: number },
    explicitDest?: { lat: number; lng: number }
  ) => {
    const f = fromText.trim();
    const t = toText.trim();
    if (!f || !t) {
      addToast('info', 'Please enter both origin and destination');
      return;
    }

    setIsSearchingRoute(true);
    setActiveDropdown(null);

    try {
      let origCoord = explicitOrigin;
      if (!origCoord) {
        if (f.toLowerCase().includes('current') || f.toLowerCase().includes('gps')) {
          origCoord = { lat: userLocation.lat, lng: userLocation.lng };
        } else {
          const matches = await stopsApi.searchPlaces(f, userLocation);
          if (matches && matches.length > 0) {
            origCoord = { lat: matches[0].lat, lng: matches[0].lng };
          } else {
            origCoord = { lat: userLocation.lat, lng: userLocation.lng };
          }
        }
      }

      let destCoord = explicitDest;
      if (!destCoord) {
        const matches = await stopsApi.searchPlaces(t, userLocation);
        if (matches && matches.length > 0) {
          destCoord = { lat: matches[0].lat, lng: matches[0].lng };
        } else {
          destCoord = { lat: 20.3527, lng: 85.8163 };
        }
      }

      let depDate = new Date();
      if (travelDate) {
        const [y, m, d] = travelDate.split('-').map(Number);
        if (y && m && d) depDate.setFullYear(y, m - 1, d);
      }
      if (urlDepartTime) {
        const [hh, mm] = urlDepartTime.split(':').map(Number);
        depDate.setHours(hh || 9, mm || 0, 0, 0);
      }

      const planRes = await journeysApi.plan({
        origin: { lat: origCoord.lat, lng: origCoord.lng, name: f },
        destination: { lat: destCoord.lat, lng: destCoord.lng, name: t },
        profileType: urlMobility === 'wheelchair' ? 'WHEELCHAIR' : urlMobility === 'elderly' ? 'ELDERLY' : 'GENERAL',
        departureTime: depDate.toISOString(),
      });

      if (planRes && planRes.options && planRes.options.length > 0) {
        setSearchResults(planRes.options);
        setSelectedIndex(0);
        addToast('success', `Found ${planRes.options.length} route options for ${t}`);
      }

      const params = new URLSearchParams(searchParams);
      params.set('origin', f);
      params.set('destination', t);
      params.set('originLat', origCoord.lat.toString());
      params.set('originLng', origCoord.lng.toString());
      params.set('destLat', destCoord.lat.toString());
      params.set('destLng', destCoord.lng.toString());
      if (travelDate) params.set('date', travelDate);
      navigate(`/routes?${params.toString()}`, { replace: true });
    } catch (err) {
      console.error('Direct route search failed:', err);
      addToast('error', 'Failed to calculate route. Please try another place.');
    } finally {
      setIsSearchingRoute(false);
    }
  };

  const handleSwapInputs = () => {
    const tempO = originInput;
    const tempD = destInput;
    setOriginInput(tempD);
    setDestInput(tempO);
    handleExecuteSearch(tempD, tempO);
  };

  // Automatically fetch & synchronize routes whenever URL origin / destination changes
  useEffect(() => {
    if (urlOrigin && urlDest) {
      const currentOrigin = searchResults[0]?.originName;
      const currentDest = searchResults[0]?.destinationName;
      if (
        searchResults.length === 0 ||
        (currentOrigin && currentOrigin !== urlOrigin) ||
        (currentDest && currentDest !== urlDest)
      ) {
        (async () => {
          let origCoord: { lat: number; lng: number } = {
            lat: urlOriginLat ?? 20.3523,
            lng: urlOriginLng ?? 85.8193,
          };
          let destCoord: { lat: number; lng: number } = {
            lat: urlDestLat ?? 20.3527,
            lng: urlDestLng ?? 85.8163,
          };

          if (!urlOriginLat || !urlOriginLng) {
            const matches = await stopsApi.searchPlaces(urlOrigin, userLocation);
            if (matches && matches.length > 0) {
              origCoord = { lat: matches[0].lat, lng: matches[0].lng };
            }
          }

          if (!urlDestLat || !urlDestLng) {
            const matches = await stopsApi.searchPlaces(urlDest, userLocation);
            if (matches && matches.length > 0) {
              destCoord = { lat: matches[0].lat, lng: matches[0].lng };
            }
          }

          let depDate = new Date();
          const activeDate = searchParams.get('date') || searchParams.get('departDate') || travelDate;
          if (activeDate) {
            const [y, m, d] = activeDate.split('-').map(Number);
            if (y && m && d) depDate.setFullYear(y, m - 1, d);
          }
          if (urlDepartTime) {
            const [hh, mm] = urlDepartTime.split(':').map(Number);
            depDate.setHours(hh || 9, mm || 0, 0, 0);
          }

          const res = await journeysApi.plan({
            origin: {
              lat: origCoord.lat,
              lng: origCoord.lng,
              name: urlOrigin,
            },
            destination: {
              lat: destCoord.lat,
              lng: destCoord.lng,
              name: urlDest,
            },
            profileType: urlMobility === 'wheelchair' ? 'WHEELCHAIR' : urlMobility === 'elderly' ? 'ELDERLY' : 'GENERAL',
            departureTime: depDate.toISOString(),
          });

          if (res && res.options && res.options.length > 0) {
            setSearchResults(res.options);
            setSelectedIndex(0);
          }
        })().catch((err) => {
          console.warn('Failed to dynamically sync route from query params:', err);
        });
      }
    }
  }, [urlOrigin, urlDest, urlOriginLat, urlOriginLng, urlDestLat, urlDestLng, urlMobility, searchParams]);

  // Carpooling States & Modals
  const [showCarpoolModal, setShowCarpoolModal] = useState<boolean>(false);
  const [carpoolModalTab, setCarpoolModalTab] = useState<'browse' | 'request'>('browse');
  const [selectedCarpoolMatch, setSelectedCarpoolMatch] = useState<CarpoolRide | null>(null);
  const [carpoolRegistryVersion, setCarpoolRegistryVersion] = useState<number>(0);

  // Form Inputs
  const [poolRoleInput, setPoolRoleInput] = useState<'passenger_split' | 'driver'>('passenger_split');
  const [poolNameInput, setPoolNameInput] = useState<string>(currentUser?.name || 'Commuter');
  const [poolPhoneInput, setPoolPhoneInput] = useState<string>(currentUser?.phoneNumber || '+91 94370 12345');
  const [poolVehicleModelInput, setPoolVehicleModelInput] = useState<string>('Tata Nexon EV');
  const [poolVehiclePlateInput, setPoolVehiclePlateInput] = useState<string>('OD-02-AZ-8890');
  const [poolDepartTimeInput, setPoolDepartTimeInput] = useState<string>(urlDepartTime || 'Flexible');
  const [poolSeatsInput, setPoolSeatsInput] = useState<number>(1);
  const [poolStepFreeInput, setPoolStepFreeInput] = useState<boolean>(false);
  const [poolNotesInput, setPoolNotesInput] = useState<string>('');

  const [infoModalRoute, setInfoModalRoute] = useState<RouteSearchResult | null>(null);
  const [currentMapZoom, setCurrentMapZoom] = useState<number>(12);
  const [selectedCoachClassOverrides, setSelectedCoachClassOverrides] = useState<Record<string, string>>({});
  const [selectedQuotaOverrides, setSelectedQuotaOverrides] = useState<Record<string, 'general' | 'tatkal'>>({});

  // Detect short-notice booking (travel within 48h defaults to Tatkal live availability)
  const travelDateParam = searchParams.get('date');
  const isShortNoticeTravel = useMemo(() => {
    if (!travelDateParam) return true;
    const d = new Date(travelDateParam);
    if (isNaN(d.getTime())) return true;
    const diffHours = (d.getTime() - Date.now()) / (1000 * 3600);
    return diffHours <= 48;
  }, [travelDateParam]);

  // Keep selected index valid
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(0);
    }
  }, [searchResults, selectedIndex]);

  // Coordinates extraction & Sanitized Geometry Stitching
  const rawFullRoute: Array<[number, number]> = selectedRoute?.geometry?.fullRoute || [];
  const originCoords: [number, number] = [
    selectedRoute?.originCoords?.lat ?? (rawFullRoute[0] ? rawFullRoute[0][0] : 20.3555),
    selectedRoute?.originCoords?.lng ?? (rawFullRoute[0] ? rawFullRoute[0][1] : 85.8145),
  ];
  const destCoords: [number, number] = [
    selectedRoute?.destinationCoords?.lat ?? (rawFullRoute[rawFullRoute.length - 1] ? rawFullRoute[rawFullRoute.length - 1][0] : 20.3450),
    selectedRoute?.destinationCoords?.lng ?? (rawFullRoute[rawFullRoute.length - 1] ? rawFullRoute[rawFullRoute.length - 1][1] : 85.8180),
  ];

  const isFlight = selectedRoute?.route?.vehicleType === 'flight' || selectedRoute?.travelScope === 'international';
  const isBus = selectedRoute?.route?.vehicleType === 'bus' || selectedRoute?.route?.id?.includes('BUS') || selectedRoute?.route?.name?.toLowerCase().includes('bus');
  const isTrain = !isBus && (selectedRoute?.route?.vehicleType === 'train' || selectedRoute?.route?.id?.includes('TRAIN') || selectedRoute?.route?.id?.includes('RAIL') || selectedRoute?.route?.id?.includes('IRCTC'));
  const isCabOrTaxi = !isFlight && !isTrain && !isBus;

  // Stitched and sanitized geometry ensuring zero disconnects and no overlapping paths
  const stitchedGeometry = useMemo(() => {
    return sanitizeAndStitchJourneyGeometry({
      originCoords,
      destCoords,
      rawIngress: selectedRoute?.geometry?.originToBoardWalk,
      rawTransit: selectedRoute?.geometry?.transitPath,
      rawConnecting: selectedRoute?.geometry?.connectingTransitPath,
      rawEgress: selectedRoute?.geometry?.alightToDestWalk,
      isDirectTransit: isCabOrTaxi,
    });
  }, [
    selectedRoute?.route?.id,
    selectedRoute?.geometry,
    originCoords[0],
    originCoords[1],
    destCoords[0],
    destCoords[1],
    isCabOrTaxi,
  ]);

  const ingressPath: Array<[number, number]> = stitchedGeometry.originToBoardWalk;
  const transitPath: Array<[number, number]> = stitchedGeometry.transitPath;
  const connectingTransitPath: Array<[number, number]> = stitchedGeometry.connectingTransitPath;
  const egressPath: Array<[number, number]> = stitchedGeometry.alightToDestWalk;
  const continuousRoute: Array<[number, number]> = stitchedGeometry.fullRoute;

  // Multi-Modal Transfer Points on Map
  const transferPoints = useMemo(() => {
    if (!selectedRoute) return [];
    const pts: Array<{
      id: string;
      latitude: number;
      longitude: number;
      fromIcon: string;
      toIcon: string;
      badgeLabel?: string;
      locationName: string;
      fromMode: string;
      toMode: string;
      description: string;
      hasRamp?: boolean;
    }> = [];

    const chain = selectedRoute.transitChainInfo;
    const isIntermodal = selectedRoute.travelScope !== 'local' && (isFlight || isTrain || selectedRoute.route?.shortName?.includes('MULTI'));

    const originHubCoord: [number, number] | null =
      transitPath.length > 0
        ? transitPath[0]
        : ingressPath.length > 0
        ? ingressPath[ingressPath.length - 1]
        : null;

    const destHubCoord: [number, number] | null =
      transitPath.length > 0
        ? transitPath[transitPath.length - 1]
        : egressPath.length > 0
        ? egressPath[0]
        : null;

    if (isIntermodal && chain) {
      if (originHubCoord) {
        pts.push({
          id: 'transfer-origin-hub',
          latitude: originHubCoord[0],
          longitude: originHubCoord[1],
          fromIcon: '🚖',
          toIcon: isFlight ? '✈️' : isTrain ? '🚆' : '🚌',
          badgeLabel: chain.originHubName,
          locationName: chain.originHubName,
          fromMode: 'Cab / City Transit',
          toMode: isFlight ? 'Flight Transit' : isTrain ? 'Train Transit' : 'Intercity Transit',
          description: `Transfer from local road transport to ${chain.originHubName}`,
          hasRamp: true,
        });
      }
      if (destHubCoord) {
        pts.push({
          id: 'transfer-dest-hub',
          latitude: destHubCoord[0],
          longitude: destHubCoord[1],
          fromIcon: isFlight ? '✈️' : isTrain ? '🚆' : '🚌',
          toIcon: '🚖',
          badgeLabel: chain.destHubName,
          locationName: chain.destHubName,
          fromMode: isFlight ? 'Flight Transit' : isTrain ? 'Train Transit' : 'Intercity Transit',
          toMode: 'Cab / Local Transport',
          description: `Arrival at ${chain.destHubName} and transfer to final destination transport`,
          hasRamp: true,
        });
      }
    }

    // Also include any intermediate transfer stops
    if (selectedRoute.intermediateStops) {
      selectedRoute.intermediateStops
        .filter((s) => s.stopRole === 'transfer')
        .forEach((stop, idx) => {
          pts.push({
            id: `transfer-stop-${stop.id || idx}`,
            latitude: stop.latitude,
            longitude: stop.longitude,
            fromIcon: '🚌',
            toIcon: '🚌',
            badgeLabel: stop.name,
            locationName: stop.name,
            fromMode: 'Inbound Transit',
            toMode: 'Outbound Transit',
            description: `Interchange at ${stop.name}`,
            hasRamp: stop.hasRamp ?? true,
          });
        });
    }

    return pts;
  }, [selectedRoute, isFlight, isTrain]);

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

  // Live Matching Carpools along this Corridor (Recomputed whenever registry or user changes)
  const matchingCarpools = useMemo(() => {
    return getMatchingCarpools(
      originCoords[0],
      originCoords[1],
      destCoords[0],
      destCoords[1],
      urlDepartTime,
      currentUser?.id,
      currentUser?.email
    );
  }, [
    originCoords,
    destCoords,
    urlDepartTime,
    currentUser?.id,
    currentUser?.email,
    carpoolRegistryVersion,
  ]);

  // Active Applied Carpool Requests by Current User
  const [activeUserCarpools, setActiveUserCarpools] = useState<CarpoolRide[]>([]);

  const refreshActiveCarpools = useCallback(() => {
    const list = getUserActiveCarpoolRequests(currentUser?.id, currentUser?.email);
    setActiveUserCarpools(list);
  }, [currentUser?.id, currentUser?.email]);

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

  // Cross-Window and Real-time Backend Synchronization for Carpools
  useEffect(() => {
    syncCarpoolRegistryWithBackend().then(() => {
      setCarpoolRegistryVersion((v) => v + 1);
    });

    const handleRegistryUpdate = () => {
      refreshActiveCarpools();
      setCarpoolRegistryVersion((v) => v + 1);
    };

    window.addEventListener('access_carpool_updated', handleRegistryUpdate);
    window.addEventListener('storage', handleRegistryUpdate);

    // Poll backend every 5s so requests from other browsers/devices appear dynamically
    const pollInterval = setInterval(() => {
      syncCarpoolRegistryWithBackend().then(() => {
        setCarpoolRegistryVersion((v) => v + 1);
      });
    }, 5000);

    return () => {
      window.removeEventListener('access_carpool_updated', handleRegistryUpdate);
      window.removeEventListener('storage', handleRegistryUpdate);
      clearInterval(pollInterval);
    };
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

  // Direct Redirect Booking Handler (MakeMyTrip / ConfirmTkt / Uber / Rapido)
  const handleDirectBooking = (mode: 'bus' | 'train' | 'flight' | 'cab' | 'auto' | 'bike', customFrom?: string, customTo?: string) => {
    const origStr = customFrom || selectedRoute?.transitChainInfo?.originHubName || selectedRoute?.originName || 'Bhubaneswar';
    const destStr = customTo || selectedRoute?.transitChainInfo?.destHubName || selectedRoute?.destinationName || 'Cuttack';
    const origCode = selectedRoute?.transitChainInfo?.originHubCode || selectedRoute?.originName?.split(',')[0] || 'BBS';
    const destCode = selectedRoute?.transitChainInfo?.destHubCode || selectedRoute?.destinationName?.split(',')[0] || 'NDLS';

    let d = new Date();
    if (travelDate) {
      const [y, m, dNum] = travelDate.split('-').map(Number);
      if (y && m && dNum) d.setFullYear(y, m - 1, dNum);
    }
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = String(d.getFullYear());
    const confirmTktDate = `${dayStr}-${monthStr}-${yearStr}`;

    if (mode === 'bus' || isBus) {
      const srcCity = extractCityForBooking(origStr, 'Bhubaneswar');
      const dstCity = extractCityForBooking(destStr, 'Cuttack');
      const url = buildExactBusBookingUrl(origStr, destStr, d);
      const busDeepLink = buildBusAppDeepLink({ originCity: srcCity, destCity: dstCity, travelDate: d });
      launchMobileAppOrWeb(busDeepLink.appScheme, url, busDeepLink.packageName);
      addToast('info', `🚌 Opening Bus Booking (${srcCity} ➔ ${dstCity}) for ${confirmTktDate} - Ready to pay`, 3000);
      return;
    }

    if (mode === 'train' || isTrain) {
      const trainNumMatch = (selectedRoute?.transitChainInfo?.flightOrTrainNumber || selectedRoute?.route?.name || '').match(/\b\d{4,5}\b/);
      const cleanTrainNum = trainNumMatch ? trainNumMatch[0] : '';
      const exactTrainUrl = selectedRoute?.transitChainInfo?.bookingUrl?.includes('confirmtkt.com/rbooking-d')
        ? selectedRoute.transitChainInfo.bookingUrl
        : cleanTrainNum
          ? buildExactTrainBookingUrl(cleanTrainNum, origCode, destCode, d)
          : `https://www.makemytrip.com/railways/listing?srcStn=${origCode}&destStn=${destCode}&date=${confirmTktDate}`;

      const trainDeepLink = buildTrainAppDeepLink({
        trainNumber: cleanTrainNum,
        originCode: origCode,
        destCode,
        travelDate: d,
      });
      launchMobileAppOrWeb(trainDeepLink.appScheme, exactTrainUrl, trainDeepLink.packageName);
      addToast(
        'info',
        cleanTrainNum
          ? `🚆 Opening Train #${cleanTrainNum} for ${confirmTktDate} - Proceed directly to review & pay!`
          : `🚆 Opening IRCTC Railways (${origCode} ➔ ${destCode}) for ${confirmTktDate}...`,
        3500
      );
      return;
    }

    if (mode === 'flight' || isFlight) {
      const flightNum = selectedRoute?.transitChainInfo?.flightOrTrainNumber?.split(' ')?.[0] || '';
      const exactFlightUrl = selectedRoute?.transitChainInfo?.bookingUrl?.includes('makemytrip.com/flight/search')
        ? selectedRoute.transitChainInfo.bookingUrl
        : buildExactFlightBookingUrl(flightNum, origCode, destCode, d);

      const flightDeepLink = buildFlightAppDeepLink({
        originAirportCode: origCode,
        destAirportCode: destCode,
        travelDate: d,
      });
      launchMobileAppOrWeb(flightDeepLink.appScheme, exactFlightUrl, flightDeepLink.packageName);
      addToast(
        'info',
        flightNum
          ? `✈️ Opening Flight ${flightNum} (${origCode} ➔ ${destCode}) for ${dayStr}/${monthStr}/${yearStr} - Proceed to pay!`
          : `✈️ Opening Flights (${origCode} ➔ ${destCode}) for ${dayStr}/${monthStr}/${yearStr}...`,
        3500
      );
      return;
    }

    // Rideshare Dispatch Modal for bike, auto, cab
    const cat = mode === 'bike' ? 'bike' : mode === 'auto' ? 'auto' : 'cab';
    openRideComparator(cat);
  };

  // Open booking / external partner provider directly
  const handleBookExternal = () => {
    if (!selectedRoute) return;
    const info = getRouteTransportInfo(selectedRoute);
    if (info.type === 'train') handleDirectBooking('train');
    else if (info.type === 'flight') handleDirectBooking('flight');
    else if (info.type === 'bus') handleDirectBooking('bus');
    else if (info.type === 'carpool') setShowCarpoolModal(true);
    else openRideComparator(info.comparatorCategory);
  };

  const handleBookLegUrl = (url?: string, label?: string) => {
    if (label?.toLowerCase().includes('irctc') || label?.toLowerCase().includes('train') || isTrain) {
      handleDirectBooking('train');
      return;
    }

    if (label?.toLowerCase().includes('flight') || isFlight) {
      handleDirectBooking('flight');
      return;
    }

    if (label?.toLowerCase().includes('bus') || isBus) {
      handleDirectBooking('bus');
      return;
    }

    if (label?.toLowerCase().includes('bike') || label?.toLowerCase().includes('rapido')) {
      openRideComparator('bike');
      return;
    }

    if (label?.toLowerCase().includes('auto')) {
      openRideComparator('auto');
      return;
    }

    if (label?.toLowerCase().includes('cab') || label?.toLowerCase().includes('taxi') || label?.toLowerCase().includes('uber') || label?.toLowerCase().includes('ola')) {
      openRideComparator('cab');
      return;
    }

    if (url) {
      launchMobileAppOrWeb(url, url);
      addToast('info', `Opening ${label || 'Booking Provider'}...`, 3000);
    }
  };

  // Carpool Match Accept
  const handleAcceptCarpool = (carpool: CarpoolRide) => {
    setSelectedCarpoolMatch(carpool);
    setShowCarpoolModal(false);
    acceptCarpoolRequest(
      carpool.id,
      currentUser?.name || 'Verified Co-Rider',
      currentUser?.phoneNumber || '+91 94370 88900'
    );
    setCarpoolRegistryVersion((v) => v + 1);
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
      userEmail: currentUser?.email,
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

    setShowCarpoolModal(false);
    setCarpoolModalTab('browse');
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

  const getModeIcon = (route: RouteSearchResult, isSelected = false) => {
    const vType = String(route.route?.vehicleType || '');
    const rId = (route.route?.id || '').toUpperCase();
    const rName = (route.route?.name || '').toLowerCase();
    const shortName = (route.route?.shortName || '').toLowerCase();

    // 1. Walk / Pedestrian / Step-Free Campus Walkway
    if (
      vType === 'walk' ||
      vType === 'foot' ||
      rId.includes('WALK') ||
      rId.includes('STEP_FREE') ||
      rName.includes('walk') ||
      rName.includes('footpath') ||
      shortName.includes('walk')
    ) {
      return <Footprints className={`w-5 h-5 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`} />;
    }

    // 2. Cycle / Bicycle / Smart Cycle Track
    if (
      vType === 'bicycle' ||
      rId.includes('CYCLE') ||
      rId.includes('BICYCLE') ||
      rName.includes('cycle') ||
      rName.includes('bicycle') ||
      shortName.includes('cycle')
    ) {
      return <Bike className={`w-5 h-5 ${isSelected ? 'text-cyan-300' : 'text-cyan-600'}`} />;
    }

    // 3. Campus EV / Electric Shuttle
    if (
      rId.includes('EV') ||
      rName.includes('campus ev') ||
      rName.includes('electric') ||
      rName.includes('shuttle') ||
      vType === 'campus-vehicle'
    ) {
      return <Zap className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-amber-500'}`} />;
    }

    // 4. Auto / E-Rickshaw / Three-Wheeler
    if (
      rId.includes('AUTO') ||
      rId.includes('RICKSHAW') ||
      rName.includes('auto') ||
      rName.includes('rickshaw') ||
      shortName.includes('auto')
    ) {
      return (
        <span className="text-xl leading-none select-none" role="img" aria-label="Auto Rickshaw">
          🛺
        </span>
      );
    }

    // 5. Bike Taxi / Rapido / Solo Bike
    if (
      rId.includes('BIKE_TAXI') ||
      rId.includes('SOLO_BIKE') ||
      rName.includes('solo bike') ||
      rName.includes('bike taxi') ||
      rName.includes('rapido')
    ) {
      return <Bike className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />;
    }

    // 6. Student Carpool / Shared Ride
    if (
      rId.includes('CARPOOL') ||
      rName.includes('carpool') ||
      rName.includes('sharing') ||
      rName.includes('share') ||
      shortName.includes('carpool')
    ) {
      return <Users className={`w-5 h-5 ${isSelected ? 'text-purple-300' : 'text-purple-600'}`} />;
    }

    // 7. Commercial Flight / Air Travel
    if (
      vType === 'flight' ||
      route.travelScope === 'international' ||
      rId.includes('FLIGHT') ||
      rName.includes('flight') ||
      rName.includes('air')
    ) {
      return <Plane className={`w-5 h-5 ${isSelected ? 'text-sky-300' : 'text-sky-600'}`} />;
    }

    // 8. Bus / Mo Bus / Public Transit (Prioritized to prevent express buses from showing train icon)
    if (
      vType === 'bus' ||
      rId.includes('BUS') ||
      rName.includes('bus') ||
      shortName.includes('bus') ||
      shortName.startsWith('route ') ||
      rName.startsWith('mo bus')
    ) {
      return <Bus className={`w-5 h-5 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`} />;
    }

    // 9. Metro / Subway / Tram
    if (rId.includes('METRO') || rName.includes('metro') || rName.includes('subway') || rName.includes('tram')) {
      return <TramFront className={`w-5 h-5 ${isSelected ? 'text-indigo-300' : 'text-indigo-600'}`} />;
    }

    // 10. Train / Indian Railways (Strictly exclude buses)
    if (
      vType === 'train' ||
      rId.includes('TRAIN') ||
      rId.includes('RAIL') ||
      rId.includes('IRCTC') ||
      (rName.includes('train') && !rName.includes('bus')) ||
      rName.includes('vande bharat') ||
      rName.includes('rajdhani') ||
      rName.includes('shatabdi') ||
      rName.includes('railway')
    ) {
      return <Train className={`w-5 h-5 ${isSelected ? 'text-blue-300' : 'text-blue-600'}`} />;
    }

    // 11. Cab / Taxi / Private Car
    return <Car className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 font-sans">
      {/* Top Header Bar with Live Interactive Route Search */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteSearch(originInput, destInput);
          }}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-2 relative"
        >
          {/* Origin Field */}
          <div className="relative flex-1">
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 focus-within:border-black focus-within:bg-white transition-colors">
              <span className="text-emerald-600 text-sm font-black">🚩</span>
              <input
                type="text"
                value={originInput}
                onChange={(e) => {
                  setOriginInput(e.target.value);
                  setActiveDropdown('origin');
                }}
                onFocus={() => setActiveDropdown('origin')}
                placeholder="From (Campus, Hostel, Stand...)"
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              {originInput && (
                <button
                  type="button"
                  onClick={() => {
                    setOriginInput('');
                    setActiveDropdown('origin');
                  }}
                  className="text-neutral-400 hover:text-neutral-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Origin Autocomplete Suggestions */}
            {activeDropdown === 'origin' && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-[1200] max-h-64 overflow-y-auto divide-y divide-neutral-100">
                {/* 1-Tap Real-Time GPS Location Quick Action */}
                <button
                  type="button"
                  onClick={() => {
                    const locName = userLocation?.placeName || 'KIIT Campus (Current GPS Location)';
                    setOriginInput(locName);
                    setActiveDropdown(null);
                    if (destInput.trim()) {
                      handleExecuteSearch(locName, destInput, { lat: userLocation.lat, lng: userLocation.lng });
                    }
                  }}
                  className="w-full text-left px-3.5 py-2.5 bg-emerald-50/70 hover:bg-emerald-100 border-b border-emerald-200 flex items-center justify-between gap-2 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Crosshair className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5 truncate">
                        <span>Use My Current Location</span>
                        <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">GPS Detected</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 truncate">{userLocation?.placeName || `${userLocation.cityName} Region`}</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                    0m away
                  </span>
                </button>

                {originSuggestions.map((place, idx) => (
                  <button
                    key={`${place.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setOriginInput(place.name);
                      setActiveDropdown(null);
                      if (destInput.trim()) {
                        handleExecuteSearch(place.name, destInput, { lat: place.lat, lng: place.lng });
                      }
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 flex items-center justify-between gap-2.5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm shrink-0">
                        {place.displayName?.startsWith('🎬') ? '🎬' :
                         place.displayName?.startsWith('🛒') ? '🛒' :
                         place.displayName?.startsWith('🛍️') ? '🛍️' :
                         place.displayName?.startsWith('☕') ? '☕' :
                         place.displayName?.startsWith('🍔') ? '🍔' :
                         place.displayName?.startsWith('🍕') ? '🍕' :
                         place.displayName?.startsWith('💊') ? '💊' :
                         place.displayName?.startsWith('🏥') ? '🏥' :
                         place.displayName?.startsWith('🏦') ? '🏦' :
                         place.displayName?.startsWith('🏋️') ? '🏋️' :
                         place.displayName?.startsWith('🚏') ? '🚏' :
                         place.displayName?.startsWith('🚆') ? '🚆' :
                         place.displayName?.startsWith('✈️') ? '✈️' :
                         place.displayName?.startsWith('👑') ? '👑' :
                         place.displayName?.startsWith('👸') ? '👸' :
                         <MapPin className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 shrink-0" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">{place.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{place.displayName || place.type}</div>
                      </div>
                    </div>
                    {place.distanceLabel && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200">
                        {place.distanceLabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwapInputs}
            title="Swap Origin and Destination"
            className="self-center p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-black transition-colors shrink-0 rotate-90 md:rotate-0 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Destination Field */}
          <div className="relative flex-1">
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 focus-within:border-black focus-within:bg-white transition-colors">
              <span className="text-red-600 text-sm font-black">🏁</span>
              <input
                type="text"
                value={destInput}
                onChange={(e) => {
                  setDestInput(e.target.value);
                  setActiveDropdown('dest');
                }}
                onFocus={() => setActiveDropdown('dest')}
                placeholder="Where to? (Shop, Cinema, Campus, Station...)"
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              {destInput && (
                <button
                  type="button"
                  onClick={() => {
                    setDestInput('');
                    setActiveDropdown('dest');
                  }}
                  className="text-neutral-400 hover:text-neutral-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Destination Autocomplete Suggestions */}
            {activeDropdown === 'dest' && destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-[1200] max-h-64 overflow-y-auto divide-y divide-neutral-100">
                {destSuggestions.map((place, idx) => (
                  <button
                    key={`${place.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setDestInput(place.name);
                      setActiveDropdown(null);
                      if (originInput.trim()) {
                        handleExecuteSearch(originInput, place.name, undefined, { lat: place.lat, lng: place.lng });
                      }
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 flex items-center justify-between gap-2.5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm shrink-0">
                        {place.displayName?.startsWith('🎬') ? '🎬' :
                         place.displayName?.startsWith('🛒') ? '🛒' :
                         place.displayName?.startsWith('🛍️') ? '🛍️' :
                         place.displayName?.startsWith('☕') ? '☕' :
                         place.displayName?.startsWith('🍔') ? '🍔' :
                         place.displayName?.startsWith('🍕') ? '🍕' :
                         place.displayName?.startsWith('💊') ? '💊' :
                         place.displayName?.startsWith('🏥') ? '🏥' :
                         place.displayName?.startsWith('🏦') ? '🏦' :
                         place.displayName?.startsWith('🏋️') ? '🏋️' :
                         place.displayName?.startsWith('🚏') ? '🚏' :
                         place.displayName?.startsWith('🚆') ? '🚆' :
                         place.displayName?.startsWith('✈️') ? '✈️' :
                         place.displayName?.startsWith('👑') ? '👑' :
                         place.displayName?.startsWith('👸') ? '👸' :
                         <MapPin className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-600 shrink-0" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">{place.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{place.displayName || place.type}</div>
                      </div>
                    </div>
                    {place.distanceLabel && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200">
                        {place.distanceLabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Travel Date & Action Buttons Responsive Group */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full md:w-auto">
            {/* Travel Date Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-2.5 focus-within:border-black focus-within:bg-white transition-colors flex-1 sm:flex-none">
              <span className="text-xs">📅</span>
              <input
                type="date"
                value={travelDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setTravelDate(e.target.value);
                  if (originInput.trim() && destInput.trim()) {
                    handleExecuteSearch(originInput, destInput);
                  }
                }}
                title="Travel Date"
                className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <button
                type="submit"
                disabled={isSearchingRoute}
                className="flex-1 sm:flex-none text-xs font-black text-white bg-black hover:bg-neutral-800 disabled:bg-neutral-400 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[38px] cursor-pointer"
              >
                {isSearchingRoute ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>{isSearchingRoute ? 'Searching...' : 'Find Routes'}</span>
              </button>

              {/* Carpool Hub Action Button (Desktop Only to keep mobile search uncluttered) */}
              <button
                type="button"
                onClick={() => {
                  setCarpoolModalTab('browse');
                  setShowCarpoolModal(true);
                }}
                className="hidden sm:flex text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-2.5 rounded-xl transition-all items-center justify-center gap-1.5 shadow-sm shrink-0 min-h-[38px] cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Carpool Hub</span>
                <span className="inline-block bg-purple-200/80 text-purple-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {matchingCarpools.length}
                </span>
              </button>
            </div>
          </div>
        </form>
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

      {/* Mobile Mode Switcher: Routes List vs Full Interactive Map */}
      <div className="lg:hidden flex items-center justify-center p-1 bg-neutral-200/70 rounded-2xl max-w-xs mx-auto mb-1">
        <button
          type="button"
          onClick={() => setMobileTab('routes')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'routes'
              ? 'bg-white text-black shadow-xs'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <span>📋 Rides & Routes</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            mobileTab === 'routes' ? 'bg-black text-white' : 'bg-neutral-300 text-neutral-800'
          }`}>
            {searchResults.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'map'
              ? 'bg-white text-black shadow-xs'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <span>🗺️ Map View</span>
        </button>
      </div>

      {/* Main Grid: Left Column = Route Choices & Details; Right Column = Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Itinerary Column: Route Choices & Trip Breakdown (5 cols on desktop, responsive tab on mobile) */}
        <div className={`order-2 lg:order-1 lg:col-span-5 space-y-4 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
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
                route.route?.name?.toLowerCase().includes('carpool');

              const isRouteSharedTaxi =
                route.route?.id?.includes('SHARED') ||
                route.route?.name?.toLowerCase().includes('sharing taxi') ||
                route.route?.name?.toLowerCase().includes('auto stand');

              const isRouteCarpoolConfirmed =
                !!selectedCarpoolMatch ||
                activeUserCarpools.some((p) => p.status === 'matched' || p.status === 'confirmed');

              const isCardTrain = route.route?.vehicleType === 'train' || route.route?.id?.includes('TRAIN') || route.route?.id?.includes('RAIL');
              const activeCardQuota = selectedQuotaOverrides[route.route.id] || (isShortNoticeTravel ? 'tatkal' : 'general');
              const activeCardCoachCode = isCardTrain
                ? (selectedCoachClassOverrides[route.route.id] || route.transitChainInfo?.selectedClassCode || route.transitChainInfo?.availableClasses?.find((c) => c.code === '3A' || c.code === 'CC')?.code || route.transitChainInfo?.availableClasses?.[0]?.code)
                : undefined;
              const activeCardCoachObj = isCardTrain && activeCardCoachCode
                ? route.transitChainInfo?.availableClasses?.find((c) => c.code === activeCardCoachCode)
                : undefined;
              const dynamicCardTicketFare = activeCardCoachObj
                ? (activeCardQuota === 'tatkal' && activeCardCoachObj.tatkalFare ? activeCardCoachObj.tatkalFare : activeCardCoachObj.fare)
                : route.priceBreakdown?.mainTicketFare;
              const displayTotalPrice = isCardTrain && route.priceBreakdown
                ? (route.priceBreakdown.ingressTaxiFare || 0) + (dynamicCardTicketFare || 0) + (route.priceBreakdown.egressTaxiFare || 0)
                : (route.priceBreakdown?.totalPrice !== undefined
                    ? route.priceBreakdown.totalPrice
                    : route.fare?.exact);

              const isRouteEstimated = isAmountEstimated(route);

              const fareDisplay = isZeroFare
                ? 'Walk (₹0)'
                : isRouteCarpool && !isRouteCarpoolConfirmed
                  ? 'Split on Match'
                  : typeof displayTotalPrice === 'number'
                    ? `₹${displayTotalPrice.toLocaleString()}`
                    : route.fare?.min !== undefined && route.fare?.max !== undefined
                      ? `₹${route.fare.min} - ₹${route.fare.max}`
                      : `₹${Math.max(10, Math.round(route.duration * 1.2))}`;

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
                        {getModeIcon(route, isSelected)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm leading-tight truncate flex items-center gap-1.5">
                          <span className="truncate">{route.route?.name?.replace(/\s*\(\d+\s*Connecting Buses\)/gi, '') || 'Transit Option'}</span>
                          {route.transitChainInfo?.flightOrTrainNumber && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-800'}`}>
                              {route.transitChainInfo.flightOrTrainNumber.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {route.route?.id?.includes('WALK') || route.route?.id?.includes('STEP_FREE') || route.route?.name?.toLowerCase().includes('walk')
                            ? '🚶 Step-Free Paved Walkway'
                            : route.route?.id?.includes('CYCLE') || route.route?.id?.includes('BICYCLE') || route.route?.name?.toLowerCase().includes('cycle')
                              ? '🚲 Dedicated Campus Cycle Track'
                              : route.route?.id?.includes('EV') || route.route?.name?.toLowerCase().includes('ev')
                                ? '⚡ KIIT Eco EV Shuttle'
                                : isRouteCarpool
                                  ? '🤝 Corridor Carpool & Ride Split'
                                  : isRouteSharedTaxi
                                    ? '🚖 Stand-Based Shared Auto / Taxi'
                                    : route.route?.id?.includes('AUTO') || route.route?.name?.toLowerCase().includes('auto') || route.route?.name?.toLowerCase().includes('rickshaw')
                                      ? '🛺 Direct Stand Auto / E-Rickshaw'
                                      : route.route?.id?.includes('BIKE') || route.route?.name?.toLowerCase().includes('bike')
                                        ? '🛵 Fast Solo Bike'
                                        : route.route?.vehicleType === 'bus' || route.route?.id?.includes('BUS') || route.route?.name?.toLowerCase().includes('bus')
                                          ? (route.route?.id?.includes('BUS_TRANSFER') || (route.transfers && route.transfers > 0)
                                              ? `🔄 ${route.transfers || 1} Transfer${(route.transfers || 1) > 1 ? 's' : ''} • Connecting Bus`
                                              : '🚌 Direct Public Bus')
                                          : route.route?.vehicleType === 'flight' || route.route?.id?.includes('FLIGHT')
                                            ? '✈️ Commercial Flight'
                                            : (route.route?.vehicleType === 'train' || route.route?.id?.includes('TRAIN') || route.route?.id?.includes('RAIL') || route.route?.id?.includes('IRCTC'))
                                              ? '🚆 Indian Railways Service'
                                              : route.route?.name?.toLowerCase().includes('cab') || route.route?.name?.toLowerCase().includes('taxi')
                                                ? '🚖 Direct Cab / Taxi'
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
                        {Boolean(dynamicCardTicketFare && dynamicCardTicketFare !== displayTotalPrice) && (
                          <div className={`text-[10px] font-bold leading-none mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {isCardTrain && activeCardCoachObj ? `Coach [${activeCardCoachObj.code}${activeCardQuota === 'tatkal' ? ' TATKAL' : ''}]: ` : 'Ticket: '}₹{dynamicCardTicketFare?.toLocaleString()}{route.fare?.status === 'estimated' ? ' (Est.)' : ''}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(idx);
                          setMobileTab('map');
                        }}
                        className={`lg:hidden w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/20 text-white hover:bg-white/30'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                        title="View route on map"
                      >
                        <span className="text-xs">🗺️</span>
                      </button>
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
                      {(() => {
                        const rInfo = getRouteTransportInfo(route);
                        if (rInfo.type === 'bike' || rInfo.type === 'auto' || rInfo.type === 'cab') {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndex(idx);
                                openRideComparator(rInfo.comparatorCategory);
                              }}
                              className={`h-7 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                isSelected
                                  ? 'bg-white/20 text-white hover:bg-white/30'
                                  : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 hover:text-black border border-neutral-200/80'
                              }`}
                              title={`Compare live ${rInfo.name} fares`}
                            >
                              <span>{rInfo.icon}</span>
                              <span className="hidden sm:inline">Compare</span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Minimal Badges (Clean, Non-congested on Mobile) */}
                  {(() => {
                    const recomInfo = vehicleRecommendations.rankedOptions.find((r) => r.originalIndex === idx);
                    const topBadge = recomInfo?.badges?.[0];
                    const crowdInfo = calculateDynamicCrowding(route.route?.vehicleType || 'bus', route.walkingDistance ? route.walkingDistance / 1000 : 5);
                    const isHighCrowd = crowdInfo.crowdingLevel === 'HIGH';

                    if (!topBadge && !isHighCrowd) return null;

                    return (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {topBadge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${topBadge.colorClass}`}>
                            {topBadge.label}
                          </span>
                        )}
                        {isHighCrowd && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isSelected ? 'bg-rose-950/60 text-rose-300 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            🔴 Rush
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Multi-modal Legs Sequence Pills (Clean, Compact for Phone) */}
                  {route.segments && route.segments.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-white/10 border-neutral-100 text-[11px] font-medium">
                      {route.segments
                        .filter((seg) => seg.type === 'walk' || seg.type === 'ride' || seg.type === 'transfer')
                        .map((seg, sIdx, arr) => {
                          let label = '';
                          if (seg.vehicleType === 'flight' || seg.routeId?.includes('FLIGHT')) {
                            label = '✈️ Flight';
                          } else if (seg.vehicleType === 'train' || seg.routeId?.includes('RAIL')) {
                            label = '🚆 Train';
                          } else if (seg.routeId?.includes('CARPOOL') || seg.routeName?.toLowerCase().includes('carpool')) {
                            label = '🤝 Carpool';
                          } else if (seg.routeId?.includes('CYCLE') || seg.routeName?.toLowerCase().includes('cycle')) {
                            label = '🚲 Cycle';
                          } else if (seg.routeId?.includes('AUTO') || seg.routeName?.toLowerCase().includes('auto') || seg.routeName?.toLowerCase().includes('rickshaw')) {
                            label = '🛺 Auto';
                          } else if (seg.type === 'walk') {
                            label = `🚶 ${seg.duration}m`;
                          } else if (seg.type === 'transfer') {
                            label = `🔄 Transfer (${seg.duration}m)`;
                          } else if (seg.vehicleType === 'bus' || seg.routeId?.includes('EV') || seg.routeId?.includes('BUS') || route.route?.vehicleType === 'bus') {
                            if (seg.routeId?.includes('EV')) {
                              label = '⚡ Campus EV';
                            } else {
                              const rName = seg.routeName || '';
                              if (/feeder/i.test(rName)) label = '🚌 Feeder';
                              else if (/sleeper|multi-axle|volvo/i.test(rName)) label = '🚌 AC Sleeper';
                              else if (/express|interstate|intercity/i.test(rName)) label = '🚌 Express Bus';
                              else if (/shuttle|connecting|local/i.test(rName)) label = '🚌 City Bus';
                              else if (/mo bus/i.test(rName)) label = `🚌 ${rName.replace(/mo bus\s*/i, '').trim() || 'Mo Bus'}`;
                              else {
                                const clean = rName.replace(/\(.*\)/g, '').trim();
                                label = clean.length > 14 ? `🚌 ${clean.slice(0, 14)}...` : `🚌 ${clean || 'Bus'}`;
                              }
                            }
                          } else if (seg.vehicleType === 'shared-transport' || route.route?.vehicleType === 'shared-transport') {
                            label = '🛺 Auto';
                          } else {
                            label = `🚶 ${seg.duration}m`;
                          }

                          return (
                            <React.Fragment key={sIdx}>
                              <span
                                className={`px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-white/15 text-neutral-200' : 'bg-neutral-100 text-neutral-700'
                                }`}
                              >
                                {label}
                              </span>
                              {sIdx < arr.length - 1 && (
                                <span className={isSelected ? 'text-neutral-400' : 'text-neutral-400'}>➔</span>
                              )}
                            </React.Fragment>
                          );
                        })}
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
                selectedRoute.route?.name?.toLowerCase().includes('carpool');

              const isSelectedCarpoolConfirmed =
                !!selectedCarpoolMatch ||
                activeUserCarpools.some((p) => p.status === 'matched' || p.status === 'confirmed');

              // Account preference & dynamic coach class resolution
              const availableTrainClasses = selectedRoute.transitChainInfo?.availableClasses || [
                { code: '3A', name: 'AC 3 Tier', fare: 810, tatkalFare: 1170, availability: 'Available 54' },
                { code: '2A', name: 'AC 2 Tier', fare: 1120, tatkalFare: 1610, availability: 'Available 16' },
                { code: '1A', name: 'AC First Class', fare: 1860, tatkalFare: 1860, availability: 'Available 4' },
                { code: 'SL', name: 'Sleeper Class', fare: 325, tatkalFare: 440, availability: 'Available 72' },
              ];

              const activeQuota = selectedQuotaOverrides[selectedRoute.route.id] || (isShortNoticeTravel ? 'tatkal' : 'general');
              const defaultClassCode = selectedRoute.transitChainInfo?.selectedClassCode || availableTrainClasses.find((c) => c.code === '3A' || c.code === 'CC')?.code || availableTrainClasses[0]?.code || '3A';
              const userPrefCoach = currentUser?.travelPreferences?.preferredTrainCoach;
              const activeCoachCode = selectedCoachClassOverrides[selectedRoute.route.id] ||
                (userPrefCoach && availableTrainClasses.some((c) => c.code === userPrefCoach)
                  ? userPrefCoach
                  : defaultClassCode);

              const activeCoachObj = availableTrainClasses.find((c) => c.code === activeCoachCode) || availableTrainClasses[0];
              const dynamicTrainFare = activeQuota === 'tatkal' && activeCoachObj?.tatkalFare ? activeCoachObj.tatkalFare : (activeCoachObj?.fare || selectedRoute.priceBreakdown.mainTicketFare || availableTrainClasses[0].fare);

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
                          ? 'Walk (₹0)'
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


                  {/* On-The-Spot Train Coach Class Selector & Quota (General vs Tatkal) */}
                  {isTrain && (
                    <div className="bg-white border border-neutral-200 rounded-xl p-2.5 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-neutral-700 flex items-center gap-1">
                          <span>🚆</span>
                          <span>IRCTC Coach Class & Official Live Fares:</span>
                        </span>
                        <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md text-[10px]">
                          {activeCoachObj.name} ({activeQuota === 'tatkal' ? 'Tatkal' : 'General'}: ₹{dynamicTrainFare.toLocaleString()})
                        </span>
                      </div>

                      {/* Quota Switcher: General vs Tatkal */}
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-neutral-50 rounded-lg border border-neutral-200/80">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-600">
                          <span>🎫 Quota:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedQuotaOverrides((prev) => ({ ...prev, [selectedRoute.route.id]: 'general' }))}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              activeQuota === 'general'
                                ? 'bg-neutral-900 text-white shadow-xs'
                                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            General (GN)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedQuotaOverrides((prev) => ({ ...prev, [selectedRoute.route.id]: 'tatkal' }))}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              activeQuota === 'tatkal'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            <span>⚡ Tatkal (TQ)</span>
                            <span className="text-[9px] font-black uppercase opacity-90">Live</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {availableTrainClasses.map((cls) => {
                          const isSel = cls.code === activeCoachCode;
                          const effectiveFare = activeQuota === 'tatkal' && cls.tatkalFare ? cls.tatkalFare : cls.fare;
                          return (
                            <button
                              key={cls.code}
                              type="button"
                              onClick={() => setSelectedCoachClassOverrides((prev) => ({ ...prev, [selectedRoute.route.id]: cls.code }))}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex flex-col items-start gap-0.5 ${isSel
                                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                                }`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{cls.code}</span>
                                {activeQuota === 'tatkal' && (
                                  <span className={`text-[8px] font-black px-1 rounded uppercase tracking-wider ${
                                    isSel ? 'bg-amber-500 text-black' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    Tatkal
                                  </span>
                                )}
                                <span className={`text-[10px] ml-0.5 font-bold ${isSel ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                  ₹{effectiveFare.toLocaleString()}
                                </span>
                              </div>
                              {cls.availability && (
                                <span className={`text-[9px] font-semibold leading-none ${isSel ? 'text-emerald-300/90' : 'text-emerald-600'}`}>
                                  {cls.availability}
                                </span>
                              )}
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
                        ? `${leg.title} [Coach: ${activeCoachCode} ${activeQuota === 'tatkal' ? 'TATKAL' : 'GN'}]`
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
                                onClick={() => {
                                  setCarpoolModalTab('request');
                                  setShowCarpoolModal(true);
                                }}
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
                                  else if (leg.mode === 'bike') openRideComparator('bike');
                                  else if (leg.mode === 'auto') openRideComparator('auto');
                                  else openRideComparator('cab');
                                }}
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <span>{leg.mode === 'bike' ? 'Book Bike' : leg.mode === 'auto' ? 'Book Auto' : leg.mode === 'cab' || leg.mode === 'taxi' ? 'Book Cab' : 'Book'}</span>
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

            {/* Specific Transport Price Compare Banner (when not carpool) */}
            {(() => {
              const selectedTransportDetails = getRouteTransportInfo(selectedRoute);
              if (
                selectedTransportDetails.type === 'bike' ||
                selectedTransportDetails.type === 'auto' ||
                selectedTransportDetails.type === 'cab'
              ) {
                return (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{selectedTransportDetails.icon}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 text-xs">
                          {selectedTransportDetails.compareBannerTitle}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {selectedTransportDetails.compareBannerSubtitle}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRideComparator(selectedTransportDetails.comparatorCategory)}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      Compare
                    </button>
                  </div>
                );
              }

              return null;
            })()}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleStart}
                className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm min-h-[44px] cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>Start Live Navigation</span>
              </button>

              {(() => {
                const isSelectedRouteCarpool =
                  selectedRoute.route?.id?.includes('CARPOOL') ||
                  selectedRoute.route?.name?.toLowerCase().includes('carpool');

                const isSelectedRouteSharedTaxi =
                  selectedRoute.route?.id?.includes('SHARED') ||
                  selectedRoute.route?.name?.toLowerCase().includes('sharing taxi') ||
                  selectedRoute.route?.name?.toLowerCase().includes('auto stand');

                if (isSelectedRouteCarpool || isSelectedRouteSharedTaxi) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setCarpoolModalTab('browse');
                        setShowCarpoolModal(true);
                      }}
                      className="py-3 sm:py-3.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-sm text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-sm min-h-[44px] cursor-pointer"
                      title="Open Carpool Hub to match with co-riders on this route"
                    >
                      <Users className="w-4 h-4" />
                      <span>🤝 Carpool Hub ({matchingCarpools.length})</span>
                    </button>
                  );
                }

                const selectedTransportDetails = getRouteTransportInfo(selectedRoute);

                if (selectedTransportDetails.type === 'bike') {
                  return (
                    <button
                      type="button"
                      onClick={() => openRideComparator('bike')}
                      className="py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer shadow-sm"
                    >
                      <span className="text-base">🛵</span>
                      <span>Compare & Book Bike Taxi</span>
                    </button>
                  );
                }

                if (selectedTransportDetails.type === 'auto') {
                  return (
                    <button
                      type="button"
                      onClick={() => openRideComparator('auto')}
                      className="py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm text-neutral-950 bg-amber-400 hover:bg-amber-500 transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer shadow-sm"
                    >
                      <span className="text-base">🛺</span>
                      <span>Compare & Book Auto</span>
                    </button>
                  );
                }

                if (selectedTransportDetails.type === 'cab') {
                  return (
                    <button
                      type="button"
                      onClick={() => openRideComparator('cab')}
                      className="py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-neutral-900 hover:bg-black transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer shadow-sm"
                    >
                      <span className="text-base">🚗</span>
                      <span>Compare & Book Cab</span>
                    </button>
                  );
                }

                if (
                  selectedTransportDetails.type === 'walk' ||
                  selectedTransportDetails.type === 'ev' ||
                  selectedTransportDetails.type === 'cycle'
                ) {
                  return null;
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isTrain) handleDirectBooking('train');
                      else if (isFlight) handleDirectBooking('flight');
                      else if (isBus) handleDirectBooking('bus');
                      else openRideComparator('cab');
                    }}
                    className={`py-3 sm:py-3.5 px-4 rounded-xl font-bold text-sm text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 min-h-[44px] cursor-pointer shadow-sm ${
                      isTrain ? 'bg-blue-700 hover:bg-blue-800' : isFlight ? 'bg-neutral-900 hover:bg-neutral-800' : isBus ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-neutral-900 hover:bg-black'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{isTrain ? 'Book IRCTC Train' : isFlight ? 'Book Flight Ticket' : isBus ? 'Book Bus Ticket' : '🚗 Compare Cabs & Book'}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Map Column: Clean OpenStreetMap (Visible when mobileTab === 'map' on mobile, and always on desktop) */}
        <div className={`order-1 lg:order-2 lg:col-span-7 sticky top-4 ${mobileTab === 'routes' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm h-[calc(100dvh-190px)] min-h-[460px] lg:h-[620px] w-full relative">
            {/* 🧭 Google Maps Style Turn-by-Turn Navigation Guidance Card */}
            <div className="absolute top-3 left-3 right-3 sm:right-auto z-[1000] pointer-events-auto sm:max-w-md">
              <div className="bg-white/95 backdrop-blur-md border border-neutral-200 shadow-md rounded-2xl p-2 sm:p-2.5 transition-all select-none">
                <div className="flex items-center gap-2">
                  {/* High-Contrast Mode Icon */}
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-base shadow-xs border ${nextActionInfo.iconBg}`}>
                    {nextActionInfo.icon}
                  </div>

                  {/* Clean Action Instruction */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 leading-tight">
                      <span className="font-extrabold text-neutral-900 text-xs sm:text-[13px] truncate block">
                        {nextActionInfo.action}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-neutral-500 truncate mt-0.5 flex items-center gap-1 font-medium">
                      <span>{nextActionInfo.detail}</span>
                    </div>
                  </div>

                  {/* Summary & Steps Toggle */}
                  <div className="shrink-0 flex flex-col items-end gap-0.5 pl-1.5 border-l border-neutral-100">
                    <span className="text-[11px] sm:text-xs font-black text-neutral-900 leading-tight">
                      {selectedRoute.duration} min
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRouteOverview((prev) => !prev)}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>{showRouteOverview ? 'Hide ▴' : 'Steps ▾'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Expandable Steps Drawer */}
                {showRouteOverview && (
                  <div className="mt-2 pt-2 border-t border-neutral-100 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-700 font-bold text-[11px]">
                      <span>🚩</span>
                      <span className="truncate">{selectedRoute.originName}</span>
                    </div>

                    {selectedRoute.intermediateStops && selectedRoute.intermediateStops.length > 0 ? (
                      selectedRoute.intermediateStops.map((st, i) => (
                        <div key={st.id || i} className="flex items-center gap-1.5 pl-3 border-l-2 border-dashed border-emerald-400 text-neutral-600 text-[11px]">
                          <span>{i === 0 ? '🚏' : i === selectedRoute.intermediateStops!.length - 1 ? '🏁' : '•'}</span>
                          <span className="truncate">{st.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-1.5 pl-3 border-l-2 border-dashed border-emerald-400 text-neutral-600 text-[11px]">
                        <span>➔</span>
                        <span>Direct corridor travel to destination</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-neutral-700 font-bold text-[11px]">
                      <span>🏁</span>
                      <span className="truncate">{selectedRoute.destinationName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <MapContainer
              center={originCoords}
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
              scrollWheelZoom={false}
              attributionControl={false}
            >
              <TileLayer
                key={mapType}
                url={
                  mapType === 'satellite'
                    ? 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
                    : mapType === 'terrain'
                    ? 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
                    : 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
                }
                subdomains={['0', '1', '2', '3']}
                maxZoom={20}
                keepBuffer={4}
                updateWhenZooming={true}
                updateWhenIdle={false}
              />

              <MapMobileResizer isActive={mobileTab === 'map'} />
              <MapBoundsController coordinates={continuousRoute} forceRecenter={mobileTab === 'map'} />
              <MapZoomListener onZoomChange={setCurrentMapZoom} />
              <MapCustomControls
                coordinates={continuousRoute}
                mapType={mapType}
                setMapType={setMapType}
              />

              {/* 1. Ingress Pedestrian Path: Origin 'A' to Boarding Stop (Vibrant Blue Dashed with White Glow Casing) */}
              {ingressPath.length > 0 && (
                <>
                  <Polyline
                    positions={ingressPath}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 7,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  <Polyline
                    positions={ingressPath}
                    pathOptions={{
                      color: '#2563eb',
                      weight: 4,
                      opacity: 0.95,
                      dashArray: '6, 8',
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </>
              )}

              {/* 2. Main Transit Corridor (Flight / Rail / Bus Leg 1 / Carpool) */}
              {transitPath.length > 0 && (
                <>
                  <Polyline
                    positions={transitPath}
                    pathOptions={{
                      color: '#ffffff',
                      weight: isFlight ? 6 : 9,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  <Polyline
                    positions={transitPath}
                    pathOptions={{
                      color: isFlight ? '#0284c7' : isTrain ? '#1d4ed8' : selectedRoute.route?.vehicleType === 'bus' ? '#059669' : '#9333ea',
                      weight: isFlight ? 4 : 6,
                      opacity: 0.95,
                      dashArray: isFlight ? '12, 10' : undefined,
                      className: isFlight ? 'animated-flight-flow' : 'animated-route-flow',
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </>
              )}

              {/* 3. Connecting Transit Leg (Bus Leg 2 after Interchange - Distinct Royal Purple) */}
              {connectingTransitPath.length > 0 && (
                <>
                  <Polyline
                    positions={connectingTransitPath}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 9,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  <Polyline
                    positions={connectingTransitPath}
                    pathOptions={{
                      color: '#7c3aed',
                      weight: 6,
                      opacity: 0.95,
                      className: 'animated-route-flow',
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </>
              )}

              {/* 4. Egress Pedestrian Path: Alight Stop to Destination 'B' (Vibrant Blue Dashed with White Glow Casing) */}
              {egressPath.length > 0 && (
                <>
                  <Polyline
                    positions={egressPath}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 7,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  <Polyline
                    positions={egressPath}
                    pathOptions={{
                      color: '#2563eb',
                      weight: 4,
                      opacity: 0.95,
                      dashArray: '6, 8',
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                </>
              )}

              {/* Origin Marker (Compact 28px circular beacon - no text rectangle collision) */}
              <Marker position={originCoords} icon={originPin}>
                <Popup>
                  <div className="text-xs font-bold p-1">
                    <div className="text-emerald-700 flex items-center gap-1 font-black">
                      <span>🚩 Journey Start (A)</span>
                    </div>
                    <div className="text-neutral-900 font-bold mt-1 text-sm">{selectedRoute.originName}</div>
                    {ingressPath.length > 0 && (
                      <div className="text-[11px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
                        <span>🚶 Walk along blue dashed path to boarding stop</span>
                      </div>
                    )}
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

              {/* 🚉 REAL INTERMEDIATE TRANSIT STATIONS & AIRPORTS ON MAP (Concise, Uncluttered Badges) */}
              {selectedRoute.intermediateStops && selectedRoute.intermediateStops.map((stop, sIdx) => {
                // Prevent duplicate overlapping markers if already rendered by transferPoints
                const isNearTransfer = transferPoints.some(
                  (tp) => Math.abs(tp.latitude - stop.latitude) < 0.0008 && Math.abs(tp.longitude - stop.longitude) < 0.0008
                );
                if (isNearTransfer) return null;

                const isTrainStop = isTrain || selectedRoute.route?.vehicleType === 'train';
                const isFlightStop = isFlight || selectedRoute.route?.vehicleType === 'flight';
                const isFirst = sIdx === 0;
                const isLast = sIdx === selectedRoute.intermediateStops!.length - 1;
                const isTransfer = stop.stopRole === 'transfer';
                const isCrucialActionStop = isFirst || isLast || isTransfer;

                // Concise station name to avoid wide text overlapping
                const cleanShortName = (stop.name || '')
                  .split('(')[0]
                  .replace(/Central Railway Station/gi, 'Central')
                  .replace(/Railway Station/gi, 'Station')
                  .replace(/Central Transit Hub/gi, 'Hub')
                  .replace(/Transit Station & Chowk/gi, 'Station')
                  .replace(/Transit Station/gi, 'Station')
                  .replace(/International Airport/gi, 'Airport')
                  .replace(/Medical Hospital Gate/gi, 'KIMS Hospital')
                  .replace(/Medical College & Hospital/gi, 'Hospital')
                  .replace(/Institute of Medical Sciences/gi, 'KIMS')
                  .replace(/Bus Terminal/gi, 'Terminal')
                  .replace(/Bus Stop/gi, '')
                  .replace(/Main Entrance/gi, '')
                  .trim();

                // Clean, subtle milestone dot for non-critical pass-through stops (avoids cluttering the map)
                if (!isCrucialActionStop) {
                  const dotIcon = L.divIcon({
                    html: `<div style="width:8px;height:8px;background:#ffffff;border:2.5px solid #059669;border-radius:9999px;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:pointer;" title="${cleanShortName}"></div>`,
                    className: 'custom-milestone-pin',
                    iconSize: [8, 8],
                    iconAnchor: [4, 4],
                  });
                  return (
                    <Marker
                      key={`station-stop-${stop.id}-${sIdx}`}
                      position={[stop.latitude, stop.longitude]}
                      icon={dotIcon}
                    >
                      <Popup>
                        <div className="text-xs p-1 font-bold">
                          <span className="text-emerald-700">🚏 Pass-through: </span>
                          <span className="text-neutral-900">{stop.name}</span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }

                // If this is boarding/alighting stop right on top of Origin (A) or Destination (B), avoid redundant text badge collision
                const isVeryCloseToOrigin = Math.abs(stop.latitude - originCoords[0]) < 0.0004 && Math.abs(stop.longitude - originCoords[1]) < 0.0004;
                const isVeryCloseToDest = Math.abs(stop.latitude - destCoords[0]) < 0.0004 && Math.abs(stop.longitude - destCoords[1]) < 0.0004;
                if ((isFirst && isVeryCloseToOrigin) || (isLast && isVeryCloseToDest)) {
                  // The distinct A/B pin already marks this exact location
                  return null;
                }

                const roleBadge = isTransfer ? 'TRANSFER' : isFirst ? 'BOARD' : isLast ? 'ALIGHT' : 'STOP';
                const stopColor = isTransfer ? '#d97706' : isFirst ? '#059669' : isLast ? '#0284c7' : '#475569';
                const stopEmoji = isTransfer ? '🔄' : isTrainStop ? '🚆' : isFlightStop ? '✈️' : '🚏';

                // Sleek, modern compact transit node that NEVER overlaps adjacent pins or road polyline
                const pinSize: [number, number] = isTransfer ? [28, 28] : [24, 24];
                const pinAnchor: [number, number] = isTransfer ? [14, 14] : [12, 12];

                const pinHtml = `
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: ${pinSize[0]}px;
                    height: ${pinSize[1]}px;
                    background: ${stopColor};
                    color: #ffffff;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                    font-size: ${isTransfer ? '13px' : '11px'};
                    cursor: pointer;
                    transition: transform 0.15s ease;
                  " title="${stop.name} (${roleBadge})">
                    ${stopEmoji}
                  </div>
                `;

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
                          <span>{stopEmoji} {isTransfer ? 'Transfer Hub' : isFirst ? 'Boarding Stop' : isLast ? 'Alighting Stop' : isTrainStop ? 'Railway Station' : isFlightStop ? 'Airport Hub' : 'Transit Stop'}</span>
                          <span className="text-[10px] bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded font-mono font-bold">Stop #{stop.sequence}</span>
                        </div>
                        <div className="font-bold text-neutral-900 leading-snug text-sm">
                          {stop.name}
                        </div>
                        {isTransfer && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-1.5 text-[11px] text-amber-900 font-semibold">
                            🔄 Transfer Point: Change here between connecting routes
                          </div>
                        )}
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

              {/* Destination Marker (Compact 28px circular beacon) */}
              <Marker position={destCoords} icon={destPin}>
                <Popup>
                  <div className="text-xs font-bold p-1">
                    <div className="text-red-600 flex items-center gap-1 font-black">
                      <span>🏁 Journey Destination (B)</span>
                    </div>
                    <div className="text-neutral-900 font-bold mt-1 text-sm">{selectedRoute.destinationName}</div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Floating Mobile Selected Route Bar in Map View */}
            <div className="lg:hidden absolute bottom-3 left-3 right-3 z-[1000] pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md border border-neutral-200 shadow-xl rounded-2xl p-3 flex items-center justify-between gap-2.5">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-lg shrink-0">
                    {getModeIcon(selectedRoute, false)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-neutral-900 truncate">
                      {selectedRoute.route.shortName || selectedRoute.route.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-bold">
                      {selectedRoute.duration} mins • ₹{selectedRoute.fare?.exact || 30}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMobileTab('routes')}
                    className="px-2.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    📋 List
                  </button>
                  <button
                    type="button"
                    onClick={handleBookExternal}
                    className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    ⚡ Book
                  </button>
                  <button
                    type="button"
                    onClick={handleStart}
                    className="px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-black transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Start</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CARPOOLING & SHARED RIDES HUB MODAL
          ========================================================================= */}
      {/* =========================================================================
          UNIFIED CARPOOLING & SHARED RIDES HUB MODAL
          ========================================================================= */}
      {showCarpoolModal && (
        <Modal
          open={showCarpoolModal}
          onClose={() => setShowCarpoolModal(false)}
          title="🤝 Corridor Carpool Hub"
        >
          <div className="space-y-3.5 font-sans">
            {/* Modal Segmented Navigation Tabs */}
            <div className="flex p-1 bg-neutral-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setCarpoolModalTab('browse')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                  carpoolModalTab === 'browse'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>Available Co-Riders</span>
                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-black">
                  {matchingCarpools.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCarpoolModalTab('request')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                  carpoolModalTab === 'request'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <span>+ Offer / Request Ride</span>
              </button>
            </div>

            {carpoolModalTab === 'browse' ? (
              /* TAB 1: BROWSE CO-RIDERS */
              <div className="space-y-3">
                <div className="text-xs text-neutral-500 font-medium px-1">
                  Corridor: <strong className="text-neutral-800">{selectedRoute?.originName?.split('(')[0]}</strong> ➔ <strong className="text-neutral-800">{selectedRoute?.destinationName?.split('(')[0]}</strong>
                </div>

                {matchingCarpools.length > 0 ? (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
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
                          className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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
                      Post a quick request and verified commuters along your route will match with you!
                    </p>
                    <button
                      type="button"
                      onClick={() => setCarpoolModalTab('request')}
                      className="mt-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Carpool Request</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: POST / OFFER REQUEST FORM */
              <form onSubmit={handleRaisePoolSubmit} className="space-y-3 font-sans">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">
                    Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPoolRoleInput('passenger_split')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        poolRoleInput === 'passenger_split'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      🙋 Passenger (Split Fare)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolRoleInput('driver')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        poolRoleInput === 'driver'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      🚗 Driver (Offer Seats)
                    </button>
                  </div>
                </div>

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

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCarpoolModalTab('browse')}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold text-xs text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Back to Co-Riders
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Broadcast to Corridor
                  </button>
                </div>
              </form>
            )}
          </div>
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
                        : 'Walk (₹0)'}
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

            {/* Dynamic Fare Calculation Formula Breakdown */}
            {(() => {
              const vType = (infoModalRoute.route?.vehicleType || 'bus').toLowerCase();
              const modeKey = vType.includes('train') ? 'train' :
                vType.includes('flight') ? 'flight' :
                vType.includes('metro') ? 'metro' :
                vType.includes('auto') ? 'auto' :
                vType.includes('bike') ? 'bike' :
                vType.includes('cab') || vType.includes('taxi') ? 'cab' :
                vType.includes('walk') ? 'walk' : 'bus';
              const distKm = (infoModalRoute.originCoords && infoModalRoute.destinationCoords)
                ? calculateDistanceKm(
                    infoModalRoute.originCoords.lat,
                    infoModalRoute.originCoords.lng,
                    infoModalRoute.destinationCoords.lat,
                    infoModalRoute.destinationCoords.lng
                  )
                : (infoModalRoute.walkingDistance ? infoModalRoute.walkingDistance / 1000 : 5);
              const breakdown = calculateDynamicTariff(modeKey as any, distKm, infoModalRoute.duration || 15);

              return (
                <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black text-neutral-700 uppercase tracking-wider">
                    <span>Fare Calculation Formula</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Dynamic Live Rate
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded-xl border border-neutral-100">
                      <div className="text-neutral-500 text-[10px]">Base Surcharge</div>
                      <div className="font-bold text-neutral-900">₹{breakdown.baseFare}</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-neutral-100">
                      <div className="text-neutral-500 text-[10px]">Distance Rate</div>
                      <div className="font-bold text-neutral-900">
                        {breakdown.ratePerKm ? `₹${breakdown.ratePerKm}/km` : 'Tier Slab'}
                      </div>
                    </div>
                  </div>
                  {breakdown.slabDescription && (
                    <div className="text-[11px] text-neutral-600 font-medium bg-white/80 p-2 rounded-xl border border-neutral-100">
                      {breakdown.slabDescription}
                    </div>
                  )}
                  {breakdown.surgeMultiplier > 1 && (
                    <div className="flex items-center justify-between text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 font-bold">
                      <span>Peak Commute Surcharge:</span>
                      <span>{breakdown.surgeMultiplier}x Surge Factor</span>
                    </div>
                  )}
                </div>
              );
            })()}

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

      {/* Ride Provider Dispatch / Live Fare Comparison Modal */}
      {showRideDispatchModal && (
        <Modal
          open={showRideDispatchModal}
          onClose={() => setShowRideDispatchModal(false)}
          title={
            dispatchCategory === 'bike'
              ? '🛵 Compare Bike Taxi Fares'
              : dispatchCategory === 'auto'
                ? '🛺 Compare Auto Rickshaw Fares'
                : dispatchCategory === 'cab'
                  ? '🚗 Compare Private Cab Fares'
                  : dispatchCategory === 'carpool'
                    ? '🤝 Carpool Fares & Matching'
                    : 'Compare Cab & Auto Fares'
          }
        >
          <LiveCabPriceComparator
            pickupLat={originCoords[0]}
            pickupLng={originCoords[1]}
            pickupName={selectedRoute?.originName || 'Pickup Location'}
            dropLat={destCoords[0]}
            dropLng={destCoords[1]}
            dropName={selectedRoute?.destinationName || 'Destination'}
            initialCategory={dispatchCategory}
            onClose={() => setShowRideDispatchModal(false)}
            onOpenCarpool={() => {
              setShowRideDispatchModal(false);
              setShowCarpoolModal(true);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
