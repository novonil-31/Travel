import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Modal, Input } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, Clock, Bus, MapPin, CheckCircle, ShieldAlert,
  ShieldCheck, ArrowRight, Check, Sparkles, AlertTriangle,
  MessageSquarePlus, Phone, Share2, AlertOctagon, X, Star,
  ThumbsUp, Award, Volume2, Footprints, RefreshCw,
  ExternalLink, Ticket, Train, Plane, Car, LogOut, CheckCircle2,
  ChevronRight, ArrowUpRight, Shield, Lock
} from 'lucide-react';
import { haversineDistanceClient } from '../../utils/onlineRouting';
import {
  snapPointToPolyline,
  calculatePreciseRoadETA,
  computePolylineTotalDistance,
} from '../../utils/mapMatching';
import { safetyApi, reportsApi } from '../../api';
import { isGuestAccount } from '../../utils/authUtils';
import { speakTransitAnnouncement } from '../../utils/liveTransitRadar';

// Custom Map Pins
const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-nav-pin',
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
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const originPin = createMapPin('#10b981', 'A');
const destPin = createMapPin('#ef4444', 'B');
const userGpsPin = createMapPin('#000000', '📍');

// Transport Change / Mode Switch Badge Pin
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
        <span>${fromIcon}</span>
        <span style="color: #ffffff; font-size: 9px; font-weight: 900;">➔</span>
        <span>${toIcon}</span>
      </div>
    `,
    iconSize: [60, 22],
    iconAnchor: [30, 11],
  });

function NavBoundsController({
  coordinates,
  currentPos,
}: {
  coordinates: Array<[number, number]>;
  currentPos: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(coordinates);
        bounds.extend(currentPos);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch {
        // ignore bounds fit error
      }
    }
  }, [coordinates, currentPos, map]);

  return null;
}

export default function ActiveJourneyPage() {
  const navigate = useNavigate();
  const { state, completeJourney, setActiveJourney, addNotification, addReport } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showGuestSosModal, setShowGuestSosModal] = useState<boolean>(false);
  const [hasArrivedSafely, setHasArrivedSafely] = useState<boolean>(false);
  const [sosActive, setSosActive] = useState<boolean>(false);

  // Custom Report state
  const [customReportCategory, setCustomReportCategory] = useState<'safety' | 'accessibility' | 'crowding' | 'delay'>('safety');
  const [customReportText, setCustomReportText] = useState<string>('');

  // State tracking whether user has reached their decided Start / Pickup Location
  const [hasReachedStartOrigin, setHasReachedStartOrigin] = useState<boolean>(false);
  const [distToStartOriginMeters, setDistToStartOriginMeters] = useState<number>(0);

  // Active multi-stage interchange index
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  // Real GPS & Live Movement State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [remainingDistMeters, setRemainingDistMeters] = useState<number>(1200);

  // Dynamic Post-Ride Feedback Form State
  const [starRating, setStarRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');

  // Safe Coordinates Calculation
  const fullRouteArr: Array<[number, number]> = activeJourney?.geometry?.fullRoute || [];
  const originCoords: [number, number] =
    activeJourney?.originCoords ? [activeJourney.originCoords.lat, activeJourney.originCoords.lng] :
    fullRouteArr.length > 0 ? fullRouteArr[0] : [20.3555, 85.8145];
  const destCoords: [number, number] =
    activeJourney?.destinationCoords ? [activeJourney.destinationCoords.lat, activeJourney.destinationCoords.lng] :
    fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1] : [20.3450, 85.8180];

  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  // Identify Transit Mode strictly (Prevent false train/flight classifications for local bus/auto/cab)
  const isFlight = Boolean(
    activeJourney?.travelScope === 'international' ||
    activeJourney?.routeId?.startsWith('FLIGHT') ||
    activeJourney?.routeId?.startsWith('AIR') ||
    activeJourney?.transitChainInfo?.carrierCode === 'AIR' ||
    (activeJourney?.transitChainInfo?.bookingService || '').toLowerCase().includes('flight') ||
    (activeJourney?.routeName || '').toLowerCase().includes('flight') ||
    activeJourney?.segments?.some((s) => s.vehicleType === 'flight')
  );

  const isTrain = Boolean(
    activeJourney?.routeId?.startsWith('RAIL') ||
    activeJourney?.routeId?.startsWith('IRCTC') ||
    activeJourney?.routeId?.startsWith('SUPERFAST') ||
    activeJourney?.routeId?.startsWith('TRAIN') ||
    activeJourney?.transitChainInfo?.carrierCode === 'RAIL' ||
    (activeJourney?.transitChainInfo?.bookingService || '').toLowerCase().includes('irctc') ||
    (activeJourney?.routeName || '').toLowerCase().includes('vande bharat') ||
    (activeJourney?.routeName || '').toLowerCase().includes('rajdhani') ||
    (activeJourney?.routeName || '').toLowerCase().includes('tejas') ||
    (activeJourney?.routeName || '').toLowerCase().includes('shatabdi') ||
    (activeJourney?.routeName || '').toLowerCase().includes('purushottam') ||
    (activeJourney?.routeName || '').toLowerCase().includes('express') && !(activeJourney?.routeName || '').toLowerCase().includes('bus') ||
    activeJourney?.segments?.some((s) => s.vehicleType === 'train')
  );

  const isBus = Boolean(
    activeJourney?.routeId === 'C3' ||
    activeJourney?.routeId === 'C2' ||
    activeJourney?.routeId?.includes('BUS') ||
    (activeJourney?.routeName || '').toLowerCase().includes('bus') ||
    activeJourney?.segments?.some((s) => s.vehicleType === 'bus')
  );

  const mainTransitIcon = isFlight ? '✈️' : isTrain ? '🚆' : isBus ? '🚌' : '🚆';
  const ingressIcon = '🚖';
  const egressIcon = '🚖';

  // Strict Intermodal Determination: ONLY intercity / long-distance train, flight, or multi-bus journeys have transfer hubs
  const isIntermodalJourney = Boolean(
    activeJourney?.travelScope !== 'local' &&
    (isFlight || isTrain || activeJourney?.routeId === 'MULTI_BUS_COMBINATION') &&
    (activeJourney?.travelScope === 'regional' || activeJourney?.travelScope === 'domestic' || activeJourney?.travelScope === 'international')
  );

  const intermediateStops = activeJourney?.intermediateStops || [];
  const transitPath = activeJourney?.geometry?.transitPath || [];
  const originToBoardWalk = activeJourney?.geometry?.originToBoardWalk || [];
  const alightToDestWalk = activeJourney?.geometry?.alightToDestWalk || [];

  const hasOriginTransfer = Boolean(
    isIntermodalJourney &&
    ((originToBoardWalk.length > 0 && transitPath.length > 0) || transitPath.length >= 2)
  );

  const hasDestTransfer = Boolean(
    isIntermodalJourney &&
    ((alightToDestWalk.length > 0 && transitPath.length > 0) || transitPath.length >= 2)
  );

  const isMultiModalTransit = isIntermodalJourney && (hasOriginTransfer || hasDestTransfer);

  const originHubCoord: [number, number] | null =
    isIntermodalJourney && transitPath.length > 0
      ? transitPath[0]
      : isIntermodalJourney && originToBoardWalk.length > 0
      ? originToBoardWalk[originToBoardWalk.length - 1]
      : null;

  const destHubCoord: [number, number] | null =
    isIntermodalJourney && transitPath.length > 0
      ? transitPath[transitPath.length - 1]
      : isIntermodalJourney && alightToDestWalk.length > 0
      ? alightToDestWalk[0]
      : null;

  const originHubName =
    activeJourney?.transitChainInfo?.originHubName ||
    (isFlight ? 'Departure Airport' : isTrain ? 'Boarding Railway Station' : 'Transit Interchange');
  const destHubName =
    activeJourney?.transitChainInfo?.destHubName ||
    (isFlight ? 'Arrival Airport' : isTrain ? 'Arrival Railway Station' : 'Destination Transit Hub');

  // Derive target milestone based on current stage & whether user is heading to Start Location
  let targetLocationName = activeJourney?.destinationName || 'Destination';
  let targetCoords: [number, number] = destCoords;
  let stageStageCount = 1;
  let currentStageTitle = 'Live GPS Navigation';
  let nextTransportAction: {
    title: string;
    subtitle: string;
    bookingUrl?: string;
    bookingLabel: string;
    modeIcon: string;
  } | null = null;

  if (!hasReachedStartOrigin && distToStartOriginMeters > 50) {
    // PHASE 0: User is traveling from their current live GPS position to their Decided Start Location
    targetLocationName = activeJourney?.originName || 'Selected Start Location';
    targetCoords = originCoords;
    currentStageTitle = '🚶 Heading to Selected Start Location';
    nextTransportAction = null;
  } else if (isMultiModalTransit) {
    stageStageCount = 3;
    if (activeStageIndex === 0) {
      // Stage 1: Ingress to Departure Station / Airport
      targetLocationName = originHubName;
      targetCoords = originHubCoord || originCoords;
      currentStageTitle = `Stage 1: Transfer to ${originHubName}`;
      
      // Strictly set booking action ONLY if genuine Flight or Train
      if (isFlight) {
        nextTransportAction = {
          title: activeJourney?.transitChainInfo?.flightOrTrainNumber || 'Flight Ticket',
          subtitle: `Departing from ${originHubName}`,
          bookingUrl: activeJourney?.transitChainInfo?.bookingUrl || 'https://www.google.com/travel/flights',
          bookingLabel: 'Book Flight Ticket',
          modeIcon: '✈️',
        };
      } else if (isTrain) {
        nextTransportAction = {
          title: activeJourney?.transitChainInfo?.flightOrTrainNumber || 'Train Ticket',
          subtitle: `Departing from ${originHubName}`,
          bookingUrl: activeJourney?.transitChainInfo?.bookingUrl || `https://www.makemytrip.com/railways/listing?srcStn=${activeJourney?.transitChainInfo?.originHubCode || 'BBS'}&destStn=${activeJourney?.transitChainInfo?.destHubCode || 'NDLS'}`,
          bookingLabel: 'Book IRCTC Ticket',
          modeIcon: '🚆',
        };
      } else {
        nextTransportAction = null;
      }
    } else if (activeStageIndex === 1) {
      // Stage 2: Main Transit on Train / Flight
      targetLocationName = destHubName;
      targetCoords = destHubCoord || destCoords;
      currentStageTitle = `Stage 2: ${isFlight ? 'Flight Transit' : isTrain ? 'Train Transit' : 'Transit Corridor'}`;
      nextTransportAction = null;
    } else {
      // Stage 3: Destination Egress
      targetLocationName = activeJourney?.destinationName || 'Final Destination';
      targetCoords = destCoords;
      currentStageTitle = `Stage 3: Travel to Final Destination`;
      nextTransportAction = null;
    }
  } else {
    // Direct journey without multi-modal transfers (Direct Bus, Direct Auto, Direct Cab)
    targetLocationName = activeJourney?.destinationName || 'Destination';
    targetCoords = destCoords;
    currentStageTitle = isBus ? '🚌 Bus Route Navigation' : '🚖 Direct Route Navigation';
    nextTransportAction = null;
  }

  // =========================================================================
  // PROFESSIONAL MAP MATCHING & ROAD NETWORK DISTANCE ENGINE
  // =========================================================================
  const rawGpsPos: [number, number] = userLocation || originCoords;

  const snappedResult = snapPointToPolyline(
    rawGpsPos[0],
    rawGpsPos[1],
    continuousRoute,
    75 // 75m orthogonal corridor threshold
  );

  // Snapped to road network when in-transit, raw GPS when walking to pickup
  const livePos: [number, number] = hasReachedStartOrigin
    ? (snappedResult.isMatchedToRoad ? snappedResult.snappedPoint : rawGpsPos)
    : rawGpsPos;

  const liveDistToStartMeters = Math.round(
    haversineDistanceClient(rawGpsPos[0], rawGpsPos[1], originCoords[0], originCoords[1])
  );

  const walkingEtaToStartMins = calculatePreciseRoadETA(liveDistToStartMeters, 'walking', 'local');

  const effectiveRemainingDistMeters = hasReachedStartOrigin
    ? snappedResult.distanceToEndMeters
    : liveDistToStartMeters;

  const vehicleSpeedCategory =
    activeJourney?.segments?.[0]?.vehicleType ||
    (isTrain ? 'train' : isFlight ? 'flight' : isBus ? 'bus' : 'campus-vehicle');

  const liveRemainingEtaMins = calculatePreciseRoadETA(
    effectiveRemainingDistMeters,
    vehicleSpeedCategory,
    activeJourney?.travelScope || 'local'
  );

  const routeProgressPercent = hasReachedStartOrigin ? snappedResult.progressPercentage : 0;
  const totalRoadDistanceMeters = computePolylineTotalDistance(continuousRoute);

  // =========================================================================
  // STRICT REAL-WORLD GPS TRACKING WITH ROAD NETWORK SNAPPING
  // =========================================================================
  useEffect(() => {
    if (!activeJourney || hasArrivedSafely) return;

    if (navigator.geolocation) {
      // 1. Initial GPS check
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);

          const distToOrigin = Math.round(haversineDistanceClient(lat, lng, originCoords[0], originCoords[1]));
          setDistToStartOriginMeters(distToOrigin);

          if (!hasReachedStartOrigin) {
            if (distToOrigin <= 40) {
              setHasReachedStartOrigin(true);
              addToast('info', `📍 Arrived at Start Location (${activeJourney?.originName})! Commencing journey.`);
            }
            setRemainingDistMeters(distToOrigin);
          } else {
            const distToTarget = Math.round(haversineDistanceClient(lat, lng, targetCoords[0], targetCoords[1]));
            setRemainingDistMeters(distToTarget);

            // Check if arrived at intermediate interchange
            if (isMultiModalTransit && activeStageIndex < stageStageCount - 1 && distToTarget <= 80) {
              advanceToNextStage();
            }

            // Strictly complete journey ONLY when within 35m of destination
            const distToDest = Math.round(haversineDistanceClient(lat, lng, destCoords[0], destCoords[1]));
            if ((distToDest <= 35 || snappedResult.distanceToEndMeters <= 35) && !hasArrivedSafely) {
              triggerSafeArrival();
            }
          }
        },
        (err) => {
          console.warn('Initial GPS check:', err);
          if (!userLocation) setUserLocation(originCoords);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      // 2. Watch real GPS movement strictly
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);

          const distToOrigin = Math.round(haversineDistanceClient(lat, lng, originCoords[0], originCoords[1]));
          setDistToStartOriginMeters(distToOrigin);

          if (!hasReachedStartOrigin) {
            if (distToOrigin <= 40) {
              setHasReachedStartOrigin(true);
              addToast('info', `📍 Arrived at Start Location (${activeJourney?.originName})! Commencing journey.`);
            }
            setRemainingDistMeters(distToOrigin);
          } else {
            const distToTarget = Math.round(haversineDistanceClient(lat, lng, targetCoords[0], targetCoords[1]));
            setRemainingDistMeters(distToTarget);

            // Advance stage if reached intermediate interchange
            if (isMultiModalTransit && activeStageIndex < stageStageCount - 1 && distToTarget <= 80) {
              advanceToNextStage();
            }

            // Strictly complete journey ONLY when within 35m of destination
            const distToDest = Math.round(haversineDistanceClient(lat, lng, destCoords[0], destCoords[1]));
            if ((distToDest <= 35 || snappedResult.distanceToEndMeters <= 35) && !hasArrivedSafely) {
              triggerSafeArrival();
            }
          }
        },
        (err) => {
          console.warn('Live GPS watcher:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      if (!userLocation) setUserLocation(originCoords);
    }
  }, [activeJourney, destCoords, originCoords, targetCoords, hasArrivedSafely, hasReachedStartOrigin, userLocation, activeStageIndex, stageStageCount, isMultiModalTransit, snappedResult.distanceToEndMeters]);

  // Advance stage helper
  const advanceToNextStage = () => {
    setActiveStageIndex((prev) => {
      const next = prev + 1;
      addToast('info', `📍 Arrived at interchange hub! Proceeding to Stage ${next + 1}.`, 4000);
      return next;
    });
  };

  // Trigger Automatic Destination Arrival
  const triggerSafeArrival = () => {
    setHasArrivedSafely(true);

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    } catch {}

    addToast(
      'success',
      `🎉 You have safely arrived at your destination: ${activeJourney?.destinationName}!`,
      5000
    );

    addNotification({
      id: `arr-${Date.now()}`,
      title: '🎉 Destination Reached Safely',
      message: `You have arrived at ${activeJourney?.destinationName}. Thank you for traveling with Access!`,
      type: 'general',
      timestamp: new Date().toISOString(),
      read: false,
    });
  };

  // Leave / Abort Journey Handler
  const handleLeaveJourney = () => {
    setActiveJourney(null);
    setShowLeaveModal(false);
    addToast('info', 'You have exited the live navigation session.');
    navigate('/plan');
  };

  // Open direct booking URL
  const handleBookNextLeg = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      addToast('info', 'Opening ticket provider in new tab...', 3000);
    }
  };

  // Submit Custom / Safety Report
  const handleReportSubmit = (issueLabel: string, category: 'safety' | 'accessibility' | 'crowding' | 'delay' = 'safety', comment?: string) => {
    const reportItem = {
      id: `rep-${Date.now()}`,
      type: category === 'safety' ? ('delay' as any) : category,
      routeId: activeJourney?.routeId || 'UNKNOWN',
      routeName: activeJourney?.routeName,
      status: 'new' as const,
      comment: comment ? `${issueLabel}: ${comment}` : issueLabel,
      createdAt: new Date().toISOString(),
    };

    try {
      if (category === 'accessibility') {
        reportsApi.submitAccessibility({
          routeId: activeJourney?.routeId || 'TRANSIT',
          type: 'accessibility',
          issue: issueLabel,
          comment: comment || issueLabel,
        });
      } else if (category === 'crowding') {
        reportsApi.submitCrowding({
          routeId: activeJourney?.routeId || 'TRANSIT',
          level: 'HIGH',
          comment: comment || issueLabel,
        });
      } else {
        reportsApi.submitDelay({
          routeId: activeJourney?.routeId || 'TRANSIT',
          delayMinutes: 10,
          comment: comment ? `[${issueLabel}] ${comment}` : issueLabel,
        });
      }
    } catch (err) {
      console.warn('Report API:', err);
    }

    addReport(reportItem as any);
    setShowReportModal(false);
    setCustomReportText('');
    addToast('success', `⚠️ Issue reported: "${issueLabel}". Dispatch team alerted.`);
  };

  const isGuest = isGuestAccount(state.currentUser);

  const activeContact = state.currentUser?.emergencyContact || {
    name: 'Emergency Contact',
    phone: '+91 98765 43210',
  };

  const rawPhone = activeContact.phone.replace(/[^0-9]/g, '').slice(-10);
  const physicalSmsText = `🚨 EMERGENCY ALERT: ${state.currentUser?.name || 'I'} triggered SOS near ${activeJourney?.originName || 'Bhubaneswar'}. Live Google Maps: https://maps.google.com/?q=${livePos[0].toFixed(5)},${livePos[1].toFixed(5)}`;
  const nativeSmsUri = `sms:${rawPhone}?body=${encodeURIComponent(physicalSmsText)}`;
  const whatsAppUri = `https://api.whatsapp.com/send?phone=91${rawPhone}&text=${encodeURIComponent(physicalSmsText)}`;

  // Emergency SOS Trigger
  const handleSosClick = async () => {
    if (isGuest) {
      setShowGuestSosModal(true);
      addToast('info', '🔒 Please log in to activate Emergency SOS & live contact alerts.');
      return;
    }

    setSosActive(true);

    const coordsStr = `${livePos[0].toFixed(5)}, ${livePos[1].toFixed(5)}`;
    try {
      await safetyApi.sendEmergencySms({
        recipientPhone: activeContact.phone,
        recipientName: activeContact.name,
        senderName: state.currentUser?.name,
        locationName: activeJourney?.originName,
        latitude: livePos[0],
        longitude: livePos[1],
      });
    } catch (err) {
      console.warn('API Gateway error:', err);
    }

    try {
      window.location.href = nativeSmsUri;
    } catch (e) {
      console.warn('Native SMS launcher:', e);
    }

    const sosMessage = `🚨 REAL-TIME EMERGENCY SOS DISPATCHED: Live GPS location (${coordsStr}) prepared for ${activeContact.name} (${activeContact.phone}) and Transit Dispatch.`;

    addNotification({
      id: `sos-${Date.now()}`,
      title: '🚨 EMERGENCY SOS DISPATCHED',
      message: sosMessage,
      type: 'safety',
      timestamp: new Date().toISOString(),
      read: false,
    });

    addToast('error', `🚨 EMERGENCY SMS PREPARED: Live GPS (${coordsStr}) ready to send to ${activeContact.phone}!`);
  };

  if (!activeJourney && !hasArrivedSafely) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 font-sans">
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto">
          <Navigation className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-neutral-900">No Active Journey</h2>
        <p className="text-xs text-neutral-500">
          You don't have any navigation session in progress right now.
        </p>
        <Button onClick={() => navigate('/plan')} size="sm">
          Plan a Trip
        </Button>
      </div>
    );
  }

  const currentStep =
    activeJourney?.turnByTurn?.[0] || 'Proceed along step-free transit corridor to destination.';

  // =========================================================================
  // POST-RIDE EXPERIENCE: SMART CROWDSOURCED FEEDBACK FORM & REWARD
  // =========================================================================
  if (hasArrivedSafely) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10 space-y-5 font-sans">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto shadow-md animate-bounce">
            <CheckCircle className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
            Verified Destination Arrival 🎉
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            You Have Arrived!
          </h1>
          <p className="text-xs text-neutral-600 max-w-sm mx-auto">
            Safely reached <strong>{activeJourney?.destinationName}</strong> via <strong>{activeJourney?.routeName}</strong>.
          </p>
        </div>

        {/* Crowdsourced Feedback Card */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                Help Commuters • Live Feedback
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              +50 Karma Points
            </span>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800">
              Overall Journey Rating:
            </label>
            <div className="flex items-center gap-2 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125"
                >
                  {star <= starRating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800">
              Comments or Accessibility Notes (Optional):
            </label>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="e.g. Smooth step-free interchange, driver helped with luggage"
              rows={2}
              className="w-full text-xs p-3 rounded-2xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-black"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                completeJourney();
                addToast('success', 'Thank you for your feedback! +50 Karma Points added.');
                navigate('/plan');
              }}
              className="w-full py-3.5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Submit Feedback & Finish</span>
            </button>

            <button
              onClick={() => {
                completeJourney();
                navigate('/plan');
              }}
              className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 text-center"
            >
              Skip Feedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-4 font-sans">
      {/* Active SOS Red Emergency Bar if Triggered */}
      {sosActive && (
        <div className="bg-red-600 text-white p-4 sm:p-5 rounded-3xl shadow-xl space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-white animate-spin" />
              <span className="font-black text-sm uppercase tracking-wider">
                🚨 Emergency SOS Active
              </span>
            </div>
            <button
              onClick={() => setSosActive(false)}
              className="p-1 rounded-full hover:bg-red-700 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-red-100 leading-relaxed">
            Live GPS ({livePos[0].toFixed(5)}, {livePos[1].toFixed(5)}) prepared for <strong>{activeContact.name} ({activeContact.phone})</strong> and Transit Dispatch.
          </div>

          {/* 1-Tap Immediate SIM Carrier Dispatch Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <a
              href={nativeSmsUri}
              className="py-2.5 px-2 rounded-xl bg-white text-red-900 font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-neutral-100"
            >
              <Phone className="w-3.5 h-3.5" /> Send SMS
            </a>

            <a
              href={whatsAppUri}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-2 rounded-xl bg-emerald-700 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-emerald-800"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp Pin
            </a>

            <a
              href={`tel:${activeContact.phone}`}
              className="py-2.5 px-2 rounded-xl bg-neutral-900 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-black"
            >
              <Phone className="w-3.5 h-3.5" /> Call Contact
            </a>

            <a
              href="tel:112"
              className="py-2.5 px-2 rounded-xl bg-red-950 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-black"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Call 112
            </a>
          </div>
        </div>
      )}

      {/* Guest Mode SOS & Real-Time Alert Notice */}
      {isGuest && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-3.5 flex items-center justify-between text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800 shadow-2xs">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-[11px] leading-tight">
              <span className="font-black text-amber-950">Guest Mode: </span>
              <span className="text-amber-900 font-medium">Log in to enable Emergency SOS & live alerts with your emergency contacts.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login?returnTo=/journey')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shrink-0 ml-2 shadow-xs transition-colors cursor-pointer"
          >
            Log In ➔
          </button>
        </div>
      )}

      {/* Top Turn-by-Turn Stage Instruction Banner */}
      <div className="bg-black text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            {!hasReachedStartOrigin && liveDistToStartMeters > 40
              ? '🚶 Heading to Pickup / Start Point'
              : currentStageTitle}
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-neutral-800 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
              {!hasReachedStartOrigin && liveDistToStartMeters > 40
                ? `${liveDistToStartMeters}m to Start (~${walkingEtaToStartMins} min)`
                : `${effectiveRemainingDistMeters >= 1000 ? (effectiveRemainingDistMeters / 1000).toFixed(1) + ' km' : effectiveRemainingDistMeters + ' m'} (~${liveRemainingEtaMins} min)`}
            </span>
            <button
              type="button"
              onClick={() => {
                const speechText = !hasReachedStartOrigin
                  ? `You are currently ${liveDistToStartMeters} meters from ${activeJourney?.originName}. Continue along the pedestrian path.`
                  : `Approaching milestone ${targetLocationName}. Remaining distance is ${effectiveRemainingDistMeters >= 1000 ? (effectiveRemainingDistMeters / 1000).toFixed(1) + ' kilometers' : effectiveRemainingDistMeters + ' meters'}. Estimated arrival in approximately ${liveRemainingEtaMins} minutes.`;
                speakTransitAnnouncement(speechText);
                addToast('info', '🔊 Speaking live navigation instruction', 3000);
              }}
              className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Speak Live Navigation Announcement"
            >
              <Volume2 className="w-3 h-3" />
              <span>Voice</span>
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Action Instruction */}
        <div className="pt-1 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              {!hasReachedStartOrigin && liveDistToStartMeters > 40 ? 'Start / Pickup Location:' : 'Destination Milestone:'}
            </span>
            <p className="text-base sm:text-lg font-black text-white leading-snug mt-0.5 truncate">
              {!hasReachedStartOrigin && liveDistToStartMeters > 40 ? activeJourney?.originName : targetLocationName}
            </p>
            <p className="text-xs text-neutral-300 mt-1 font-medium leading-relaxed">
              {!hasReachedStartOrigin && liveDistToStartMeters > 40
                ? `You are ${liveDistToStartMeters}m away from ${activeJourney?.originName}. Follow the pedestrian path (~${walkingEtaToStartMins} min) to reach the boarding stand.`
                : `${snappedResult.distanceFromStartMeters}m traveled along road • ${routeProgressPercent}% completed`}
            </p>
          </div>

          {!hasReachedStartOrigin && liveDistToStartMeters > 40 && (
            <button
              type="button"
              onClick={() => {
                setHasReachedStartOrigin(true);
                addToast('success', `📍 Start Location confirmed! Commencing road navigation.`);
              }}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-md transition-all ml-3 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>I'm at Start Point</span>
            </button>
          )}
        </div>

        {/* Real-Time Road Journey Progress Bar */}
        {hasReachedStartOrigin && (
          <div className="pt-1">
            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(4, routeProgressPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CartoDB Voyager Live Interactive Map */}
      <div className="h-[290px] sm:h-[350px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative z-0 isolate">
        <MapContainer
          center={livePos}
          zoom={15}
          scrollWheelZoom={true}
          attributionControl={false}
          className="w-full h-full"
          style={{ zIndex: 1 }}
        >
          <TileLayer
            url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
          />
          <NavBoundsController coordinates={continuousRoute} currentPos={livePos} />

          {/* 0. Live Approach Polyline to Decided Start Point (If not yet at Start) */}
          {!hasReachedStartOrigin && liveDistToStartMeters > 40 && (
            <Polyline
              positions={[livePos, originCoords]}
              pathOptions={{
                color: '#10b981',
                weight: 4,
                dashArray: '6, 8',
                opacity: 0.9,
              }}
            />
          )}

          {/* 1. Backdrop Casing Polyline */}
          <Polyline
            positions={activeJourney?.geometry?.fullRoute || continuousRoute}
            pathOptions={{
              color: '#000000',
              weight: 8,
              opacity: 0.15,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />

          {/* 2. Ingress Road Segment */}
          {activeJourney?.geometry?.originToBoardWalk && activeJourney.geometry.originToBoardWalk.length > 0 && (
            <Polyline
              positions={activeJourney.geometry.originToBoardWalk}
              pathOptions={{
                color: isBus ? '#10b981' : '#d97706',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* 3. Main Transit Segment */}
          <Polyline
            positions={activeJourney?.geometry?.transitPath || continuousRoute}
            pathOptions={{
              color: isFlight ? '#0284c7' : isTrain ? '#1d4ed8' : isBus ? '#059669' : '#9333ea',
              weight: isFlight ? 4 : 5,
              opacity: 0.95,
              dashArray: isFlight ? '12, 10' : undefined,
              className: isFlight ? 'animated-flight-flow' : 'animated-route-flow',
            }}
          />

          {/* 4. Egress Road Segment */}
          {activeJourney?.geometry?.alightToDestWalk && activeJourney.geometry.alightToDestWalk.length > 0 && (
            <Polyline
              positions={activeJourney.geometry.alightToDestWalk}
              pathOptions={{
                color: isBus ? '#10b981' : '#d97706',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* Origin Start Marker (A) - Displayed once user begins moving */}
          {haversineDistanceClient(livePos[0], livePos[1], originCoords[0], originCoords[1]) > 50 && (
            <Marker position={originCoords} icon={originPin}>
              <Popup>
                <div className="p-1.5 text-xs space-y-1">
                  <strong className="block font-black text-emerald-700">🟢 Start Location (A)</strong>
                  <div className="font-bold text-neutral-900">{activeJourney?.originName || 'Journey Start'}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Multi-Modal Interchange Markers (Transfer 1 & Transfer 2) */}
          {hasOriginTransfer && originHubCoord && (
            <Marker
              position={originHubCoord}
              icon={createTransferPin(ingressIcon, mainTransitIcon, originHubName)}
            >
              <Popup>
                <div className="p-1.5 text-xs space-y-1 min-w-[200px]">
                  <strong className="block font-black text-neutral-900">🔄 Mode Switch Hub</strong>
                  <div className="font-bold text-neutral-800">{originHubName}</div>
                  <div className="text-[11px] font-bold text-neutral-700 bg-neutral-100 p-1.5 rounded-lg border border-neutral-200">
                    {ingressIcon} Ingress Cab ➔ {mainTransitIcon} {isFlight ? 'Flight' : isTrain ? 'Train' : 'Transit'}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {hasDestTransfer && destHubCoord && (
            <Marker
              position={destHubCoord}
              icon={createTransferPin(mainTransitIcon, egressIcon, destHubName)}
            >
              <Popup>
                <div className="p-1.5 text-xs space-y-1 min-w-[200px]">
                  <strong className="block font-black text-neutral-900">🔄 Mode Switch Hub</strong>
                  <div className="font-bold text-neutral-800">{destHubName}</div>
                  <div className="text-[11px] font-bold text-neutral-700 bg-neutral-100 p-1.5 rounded-lg border border-neutral-200">
                    {mainTransitIcon} {isFlight ? 'Flight' : isTrain ? 'Train' : 'Transit'} ➔ {egressIcon} Destination Cab
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Real-Time Live User GPS Pin with precise along-track metrics */}
          <Marker position={livePos} icon={userGpsPin}>
            <Popup>
              <div className="p-1.5 text-xs space-y-1 min-w-[175px]">
                <strong className="block font-black text-black">📍 Your Live Position</strong>
                <div className="text-[11px] font-bold text-neutral-800">
                  {!hasReachedStartOrigin
                    ? `${liveDistToStartMeters}m to Start (~${walkingEtaToStartMins} min walk)`
                    : `${effectiveRemainingDistMeters >= 1000 ? (effectiveRemainingDistMeters / 1000).toFixed(1) + ' km' : effectiveRemainingDistMeters + ' m'} to ${targetLocationName.split('(')[0]}`}
                </div>
                {hasReachedStartOrigin && (
                  <div className="text-[10px] text-neutral-500 font-medium">
                    {snappedResult.distanceFromStartMeters}m traveled • {routeProgressPercent}% completed
                  </div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker B */}
          <Marker position={destCoords} icon={destPin}>
            <Popup>
              <div className="p-1.5 text-xs space-y-1">
                <strong className="block font-black text-red-600">🔴 Destination (B)</strong>
                <div className="font-bold text-neutral-900">{activeJourney?.destinationName || 'Destination'}</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Live GPS Status Indicator */}
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-bold text-neutral-900 shadow-md flex items-center gap-2 pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live GPS Navigation Active</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NEXT TRANSPORT TICKET & BOOKING ACTION CARD (ONLY WHEN ACTUAL INTERCHANGE)
          ========================================================================= */}
      {nextTransportAction && (
        <div className="bg-white border border-neutral-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-blue-600" />
              <span>Next Transport Ticket / Booking</span>
            </span>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md">
              Upcoming Interchange
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-lg shrink-0">
                {nextTransportAction.modeIcon}
              </div>
              <div className="truncate">
                <div className="font-bold text-xs text-neutral-900 truncate">
                  {nextTransportAction.title}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {nextTransportAction.subtitle}
                </div>
              </div>
            </div>

            {nextTransportAction.bookingUrl && (
              <button
                type="button"
                onClick={() => handleBookNextLeg(nextTransportAction?.bookingUrl)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>{nextTransportAction.bookingLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Safety & Action Controls HUD */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Red SOS Button (Protected by Login) */}
        <button
          onClick={handleSosClick}
          className={`p-3.5 ${
            !isGuest ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-800 hover:bg-neutral-700'
          } text-white rounded-2xl font-black text-xs shadow-md active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer`}
        >
          {!isGuest ? (
            <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
          ) : (
            <Lock className="w-5 h-5 text-amber-400" />
          )}
          <span>{!isGuest ? 'Emergency SOS' : 'SOS (Login Req)'}</span>
        </button>

        {/* Report Issue */}
        <button
          onClick={() => setShowReportModal(true)}
          className="p-3.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl font-bold text-xs shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span>Report Issue</span>
        </button>

        {/* Leave Journey Button */}
        <button
          onClick={() => setShowLeaveModal(true)}
          className="p-3.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-2xl font-bold text-xs shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <span>Leave Journey</span>
        </button>
      </div>

      {/* =========================================================================
          LEAVE / EXIT JOURNEY CONFIRMATION MODAL
          ========================================================================= */}
      {showLeaveModal && (
        <Modal
          open={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="🚪 Leave Journey Navigation?"
        >
          <div className="space-y-4 font-sans text-xs">
            <p className="text-neutral-600 leading-relaxed">
              Are you sure you want to exit your active navigation session to <strong>{activeJourney?.destinationName}</strong>?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
              Your safety session and live GPS guidance will stop. You can plan another trip anytime.
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Continue Traveling
              </button>
              <button
                type="button"
                onClick={handleLeaveJourney}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm"
              >
                Exit Navigation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          REPORT ISSUE MODAL (WITH SAFETY & CUSTOM ISSUES)
          ========================================================================= */}
      {showReportModal && (
        <Modal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="⚠️ Report Transit or Safety Issue"
        >
          <div className="space-y-4 font-sans text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* Safety & Security Category */}
            <div>
              <div className="flex items-center gap-1.5 font-black text-red-600 text-[11px] uppercase tracking-wider mb-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Safety & Emergency Concerns</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'harassment', label: '🚨 Harassment / Threat', cat: 'safety' },
                  { id: 'rash_driving', label: '⚠️ Reckless / Rash Driving', cat: 'safety' },
                  { id: 'poor_lighting', label: '💡 Poor Lighting / Isolated Area', cat: 'safety' },
                  { id: 'medical_aid', label: '🦺 Need Medical / First-Aid Help', cat: 'safety' },
                ].map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleReportSubmit(issue.label, issue.cat as any)}
                    className="p-2.5 rounded-xl border border-red-100 bg-red-50/60 hover:bg-red-100 text-left font-bold text-red-900 transition-all text-[11px]"
                  >
                    {issue.label}
                  </button>
                ))}
              </div>
            </div>

            {/* General Transit & Accessibility Category */}
            <div>
              <div className="flex items-center gap-1.5 font-black text-neutral-700 text-[11px] uppercase tracking-wider mb-2">
                <Bus className="w-3.5 h-3.5" />
                <span>Transit & Vehicle Issues</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ramp_broken', label: '♿ Ramp / Elevator Broken', cat: 'accessibility' },
                  { id: 'crowding', label: '👥 Overcrowded Vehicle', cat: 'crowding' },
                  { id: 'delay', label: '⏱️ Severe Transit Delay', cat: 'delay' },
                  { id: 'fare_issue', label: '💳 Overcharging / Fare Issue', cat: 'delay' },
                ].map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleReportSubmit(issue.label, issue.cat as any)}
                    className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-left font-bold text-neutral-800 transition-all text-[11px]"
                  >
                    {issue.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Issue Description */}
            <div className="pt-2 border-t border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-800 block text-[11px]">
                ✍️ Report Custom Issue / Specific Feedback:
              </label>

              <div className="flex gap-2">
                {(['safety', 'accessibility', 'delay', 'crowding'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCustomReportCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                      customReportCategory === cat
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <textarea
                value={customReportText}
                onChange={(e) => setCustomReportText(e.target.value)}
                placeholder="Describe what happened or any specific assistance needed..."
                rows={3}
                className="w-full text-xs p-3 rounded-2xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-black font-medium"
              />

              <button
                type="button"
                disabled={!customReportText.trim()}
                onClick={() => handleReportSubmit(customReportText.trim(), customReportCategory, 'Custom User Feedback')}
                className="w-full py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-40 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Submit Custom Report</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          GUEST SOS ACCESS RESTRICTION MODAL
          ========================================================================= */}
      {showGuestSosModal && (
        <Modal
          open={showGuestSosModal}
          onClose={() => setShowGuestSosModal(false)}
          title="🔒 Log In to Activate Emergency SOS"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2 text-red-950">
              <div className="flex items-center gap-2 font-black text-red-900 text-sm">
                <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
                <span>Emergency Contact Alert Dispatch</span>
              </div>
              <p className="text-neutral-700 leading-relaxed text-xs">
                Emergency SOS automatically dispatches real-time SMS alerts and live Google Maps GPS coordinates to your registered emergency contacts and transit authorities.
              </p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-neutral-600 text-[11px] space-y-1.5">
              <div className="font-bold text-neutral-900">Why is a logged-in account required?</div>
              <div className="flex items-center gap-1.5 text-neutral-700">
                <span>✓</span>
                <span>Instant 1-tap SMS sent to your verified family or emergency contact.</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-700">
                <span>✓</span>
                <span>Direct coordination with Transit Safety Dispatch and Police (112).</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGuestSosModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Continue as Guest
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?returnTo=/journey')}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Log In / Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
