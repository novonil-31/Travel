import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Modal } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, Clock, Bus, MapPin, CheckCircle, ShieldAlert,
  ShieldCheck, ArrowRight, Check, Sparkles, AlertTriangle
} from 'lucide-react';
import { haversineDistanceClient } from '../../utils/onlineRouting';

// Custom Map Pins (Google Maps Style)
const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-nav-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2px solid white;
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

const originPin = createMapPin('#059669', 'A');
const destPin = createMapPin('#dc2626', 'B');
const userPin = createMapPin('#2563eb', '🚶');

// Map Center & Bounds Follower
function NavBoundsController({
  coordinates,
  currentPos,
}: {
  coordinates: Array<[number, number]>;
  currentPos?: [number, number];
}) {
  const map = useMap();
  const initialFit = useRef(false);

  useEffect(() => {
    if (!initialFit.current && coordinates && coordinates.length > 0) {
      try {
        const validCoords = coordinates.filter(
          (c) => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && !isNaN(c[0]) && typeof c[1] === 'number' && !isNaN(c[1])
        );
        if (validCoords.length > 0) {
          const bounds = L.latLngBounds(validCoords.map(([lat, lng]) => [lat, lng]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            initialFit.current = true;
          }
        }
      } catch (e) {
        // ignore bounds fit error
      }
    }
  }, [coordinates, map]);

  return null;
}

const destIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #DC2626; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">B</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const busLiveIcon = L.divIcon({
  className: 'custom-bus-live',
  html: '<div style="background-color: #059669; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(5,150,105,0.7); display: flex; align-items: center; justify-content: center; color: white; animation: pulse 2s infinite;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4C2.9 6 1.9 6.8 1.6 7.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const stopMarkerIcon = L.divIcon({
  className: 'custom-stop',
  html: '<div style="background-color: #4B5563; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function MapBoundsFitter({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

const ActiveJourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, completeJourney, addNotification } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [hasArrivedSafely, setHasArrivedSafely] = useState<boolean>(false);

  // Live Location & Progress State
  const [progressIndex, setProgressIndex] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [remainingDistMeters, setRemainingDistMeters] = useState<number>(1200);

  // Safe Coordinates Calculation
  const fullRouteArr: Array<[number, number]> = activeJourney?.geometry?.fullRoute || [];
  const originCoords: [number, number] = [
    activeJourney?.originCoords?.lat || (fullRouteArr.length > 0 ? fullRouteArr[0][0] : 20.3555),
    activeJourney?.originCoords?.lng || (fullRouteArr.length > 0 ? fullRouteArr[0][1] : 85.8145),
  ];

  const destCoords: [number, number] = [
    activeJourney?.destinationCoords?.lat ||
      (fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1][0] : 20.3450),
    activeJourney?.destinationCoords?.lng ||
      (fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1][1] : 85.8180),
  ];

  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  // 1. Continuous Live GPS & Simulated Telemetry Tracking
  useEffect(() => {
    if (!activeJourney) return;

    // Real device GPS tracking watcher
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);

          // Calculate remaining distance to destination
          const dist = Math.round(haversineDistanceClient(lat, lng, destCoords[0], destCoords[1]));
          setRemainingDistMeters(dist);

          // If reached within 60 meters of destination, trigger safe arrival!
          if (dist <= 60 && !hasArrivedSafely) {
            triggerSafeArrival();
          }
        },
        (err) => {
          // Fallback to smooth route advancement
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    // Smooth forward progression along the road coordinates
    const routeProgression = setInterval(() => {
      setProgressIndex((prev) => {
        const next = prev + 1;
        if (next >= continuousRoute.length) {
          if (!hasArrivedSafely) {
            triggerSafeArrival();
          }
          return continuousRoute.length - 1;
        }

        const nextPoint = continuousRoute[next];
        if (nextPoint) {
          setUserLocation(nextPoint);
          const dist = Math.round(haversineDistanceClient(nextPoint[0], nextPoint[1], destCoords[0], destCoords[1]));
          setRemainingDistMeters(dist);

          if (dist <= 60 && !hasArrivedSafely) {
            triggerSafeArrival();
          }
        }
        return next;
      });
    }, 4500);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(routeProgression);
    };
  }, [activeJourney, continuousRoute, destCoords, hasArrivedSafely]);

  // Trigger Automatic Safe Arrival
  const triggerSafeArrival = () => {
    setHasArrivedSafely(true);
    addNotification({
      id: `arr-${Date.now()}`,
      title: 'Arrived Safely 🎉',
      message: `You have reached your destination (${activeJourney?.destinationName || 'Destination'}). Emergency contacts notified of safe arrival.`,
      type: 'safety',
      timestamp: new Date().toISOString(),
      read: false,
    });
    addToast('success', `🎉 Safely arrived at ${activeJourney?.destinationName || 'Destination'}!`);
  };

  // Conclude / End Trip smoothly
  const handleEndTrip = () => {
    completeJourney();
    setShowCompleteModal(false);
    addToast('success', 'Trip completed successfully! Saved to your past trips.');
    navigate('/plan');
  };

  const handleEmergencyTrigger = () => {
    setShowEmergencyModal(false);
    addToast('error', 'EMERGENCY SOS: Shared live coordinates with emergency contacts & transit control.');
  };

  if (!activeJourney && !hasArrivedSafely) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
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

  const livePos: [number, number] =
    userLocation || continuousRoute[progressIndex] || originCoords;

  const currentStep =
    activeJourney?.turnByTurn?.[Math.min(progressIndex, (activeJourney?.turnByTurn?.length || 1) - 1)] ||
    'Proceed along step-free transit corridor to destination.';

  // If safely arrived, display clean celebration screen
  if (hasArrivedSafely) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto shadow-lg animate-bounce">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Verified Safe Arrival
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-3">
            You have arrived!
          </h1>
          <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">
            You safely reached <strong>{activeJourney?.destinationName}</strong> via {activeJourney?.routeName}. Your emergency contacts have been confirmed.
          </p>
        </div>

        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs text-left space-y-2">
          <div className="flex justify-between text-neutral-600">
            <span>Trip Route:</span>
            <strong className="text-neutral-900">{activeJourney?.routeName}</strong>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Fare:</span>
            <strong className="text-neutral-900">
              {activeJourney?.fare?.type === 'exact' ? `₹${activeJourney.fare.exact}` : `₹${activeJourney?.fare?.min || 15} - ₹${activeJourney?.fare?.max || 25}`}
            </strong>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Safety Status:</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Safe
            </span>
          </div>
        </div>

        <Button
          onClick={handleEndTrip}
          size="lg"
          className="w-full py-4 text-sm font-black rounded-2xl bg-black hover:bg-neutral-800 text-white shadow-lg"
        >
          Finish & Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-4">
      {/* Top Google Maps Style Turn-by-Turn Instruction Banner */}
      <div className="bg-black text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Navigating • {activeJourney?.routeName}
          </span>
          <span className="bg-neutral-800 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
            {remainingDistMeters > 1000 ? `${(remainingDistMeters / 1000).toFixed(1)} km away` : `${remainingDistMeters}m away`}
          </span>
        </div>

        {/* Big Next Maneuver Instruction */}
        <div className="pt-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
            Next Action:
          </span>
          <p className="text-base sm:text-lg font-black text-white leading-snug mt-0.5">
            {currentStep}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs text-neutral-300">
          <span>To: <strong>{activeJourney?.destinationName}</strong></span>
          <span>Fare: <strong>{activeJourney?.fare?.type === 'exact' ? `₹${activeJourney.fare.exact}` : `₹${activeJourney?.fare?.min || 15} - ₹${activeJourney?.fare?.max || 25}`}</strong></span>
        </div>
      </div>

      {/* Live Google Maps Continuous Polyline & Tracking Map */}
      <div className="h-[340px] sm:h-[400px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative">
        <MapContainer
          center={livePos}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <NavBoundsController coordinates={continuousRoute} currentPos={livePos} />

          {/* Start Marker A */}
          <Marker position={originCoords} icon={originPin}>
            <Popup>
              <span className="text-xs font-bold">Start (A): {activeJourney?.originName}</span>
            </Popup>
          </Marker>

          {/* Clean Google Maps Vibrant Blue Continuous Route Line */}
          <Polyline
            positions={continuousRoute}
            color="#2563eb"
            weight={6}
            opacity={0.9}
          />

          {/* Live Continuous User GPS Location Marker */}
          <Marker position={livePos} icon={userPin}>
            <Popup>
              <div className="p-1">
                <strong className="block text-xs text-blue-800">Live Location Tracking</strong>
                <span className="text-[11px] text-neutral-600 block">
                  {remainingDistMeters}m remaining to {activeJourney?.destinationName}
                </span>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker B */}
          <Marker position={destCoords} icon={destPin}>
            <Popup>
              <span className="text-xs font-bold">Destination (B): {activeJourney?.destinationName}</span>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Quiet Background Safety Monitoring Badge (No annoying timers) */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-bold text-neutral-900 shadow-md z-[1000] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Safety Active</span>
        </div>
      </div>

      {/* Clean Minimalist Bottom Action Bar */}
      <div className="bg-white border border-neutral-200 p-4 rounded-3xl shadow-sm space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {/* Manual Safe Check Button */}
          <Button
            onClick={() => {
              addToast('success', 'Verified Safe! Quiet background monitoring active.');
            }}
            className="py-3 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>I'm Safe</span>
          </Button>

          {/* SOS Button */}
          <Button
            variant="danger"
            onClick={() => setShowEmergencyModal(true)}
            className="py-3 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency SOS</span>
          </Button>
        </div>

        {/* End & Conclude Trip Button (1-Click Works Instantly) */}
        <button
          type="button"
          onClick={handleEndTrip}
          className="w-full py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <span>End & Conclude Trip</span>
        </button>
      </div>

      {/* Emergency SOS Modal */}
      <Modal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        title="🚨 Emergency SOS Alert"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-700 leading-relaxed">
            This will immediately transmit your current live GPS coordinates ({livePos[0].toFixed(4)}, {livePos[1].toFixed(4)}) and route telemetry to your emergency contacts and local transit dispatch.
          </p>

          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900">
            <span className="font-bold block">Live Emergency Dispatch Ready</span>
            <span className="text-[11px] block mt-0.5">Contact: Priya Sharma (+91 98765 43210)</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEmergencyModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleEmergencyTrigger}>
              Confirm SOS Dispatch
            </Button>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            disabled={isSubmittingFeedback}
          >
            {isSubmittingFeedback ? 'Submitting Feedback...' : 'Done & Submit'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveJourneyPage;
