import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Badge, Modal, ProgressBar } from '../../components/ui';
<<<<<<< HEAD
import { SafetyStatusBadge, CrowdingIndicator } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Shield,
  ShieldAlert,
  Navigation,
  CheckCircle2,
  MapPin,
  Bus,
  Clock,
  AlertTriangle,
  RotateCw,
  HeartHandshake,
} from 'lucide-react';
import { safetyApi, reportsApi } from '../../api';
import type { SafetySession } from '../../types';

// Custom Markers
const originIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #2563EB; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">A</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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
=======
import { SafetyStatusBadge, CrowdingIndicator, DelayBadge } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Shield, ShieldAlert, Navigation, CheckCircle, MapPin, HeartPulse, AlertTriangle, ArrowRight, Bus, Clock, UserCheck } from 'lucide-react';
import type { SafetySession } from '../../types';

// Fix leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function ActiveJourneyPage() {
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
  const navigate = useNavigate();
  const { state, completeJourney, updateSafetySession } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

<<<<<<< HEAD
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [crowdingFeedback, setCrowdingFeedback] = useState<string>('LOW');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Live Vehicle Position along route
  const [vehicleIndex, setVehicleIndex] = useState(0);

  const fullRoutePoints: Array<[number, number]> =
    activeJourney?.geometry?.fullRoute && activeJourney.geometry.fullRoute.length > 0
      ? activeJourney.geometry.fullRoute
      : [
          [activeJourney?.originCoords?.lat || 20.3533, activeJourney?.originCoords?.lng || 85.8164],
          [activeJourney?.destinationCoords?.lat || 20.3625, activeJourney?.destinationCoords?.lng || 85.8241],
        ];

  // Real-time Vehicle Movement Simulation along OSRM Polyline
  useEffect(() => {
    if (!activeJourney || fullRoutePoints.length <= 1) return;

    const interval = setInterval(() => {
      setVehicleIndex((prev) => (prev + 1) % fullRoutePoints.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [activeJourney, fullRoutePoints.length]);
=======
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [heartbeatTime, setHeartbeatTime] = useState<number>(30); // 30s demo timer

  // Heartbeat countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeatTime(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793

  if (!activeJourney) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
<<<<<<< HEAD
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">No Active Journey</h2>
        <p className="text-gray-500">You don't have a journey currently in progress.</p>
        <Button onClick={() => navigate('/plan')} className="bg-primary-600 hover:bg-primary-700">
          Plan a Journey
=======
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mx-auto animate-float">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">No Active Journey</h2>
        <p className="text-sm text-slate-400">Plan a route to start real-time accessible tracking and safety check-ins.</p>
        <Button onClick={() => navigate('/plan')} size="lg" className="shadow-glow-green">
          <Navigation className="w-4 h-4 mr-2" /> Plan a Journey
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
        </Button>
      </div>
    );
  }

  const currentVehiclePos = fullRoutePoints[vehicleIndex] || fullRoutePoints[0]!;

  const handleSafeCheckIn = async () => {
    if (activeJourney.safetySession) {
      try {
        await safetyApi.heartbeat(activeJourney.safetySession.id);
      } catch {
        // local state still updates
      }
      const updated: SafetySession = {
        ...activeJourney.safetySession,
        status: 'SAFE',
        lastCheckIn: new Date().toISOString(),
      };
      updateSafetySession(updated);
      setHeartbeatTime(30);
      addToast('success', 'Verified Safe. Heartbeat reset.');
    }
  };

  const handleEmergency = async () => {
    if (activeJourney.safetySession) {
      try {
        await safetyApi.emergency(activeJourney.safetySession.id);
      } catch {
        // ignore
      }
      const updated: SafetySession = {
        ...activeJourney.safetySession,
        status: 'EMERGENCY',
        emergencyContactNotified: true,
      };
      updateSafetySession(updated);
      setShowEmergencyModal(false);
<<<<<<< HEAD
      addToast('error', 'Emergency mode activated. Contacts notified.');
=======
      addToast('error', 'Emergency mode active. Emergency contacts and transit dispatch notified.');
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
    }
  };

  const handleComplete = async () => {
    setIsSubmittingFeedback(true);
    try {
      if (activeJourney.routeId) {
        await reportsApi.submitCrowdingFeedback({
          routeId: activeJourney.routeId,
          level: crowdingFeedback,
          journeyId: activeJourney.id,
        });
      }
    } catch {
      // ignore
    }

    completeJourney();
    setIsSubmittingFeedback(false);
    setShowCompleteModal(false);
    navigate('/journeys');
<<<<<<< HEAD
    addToast('success', 'Journey completed! Thank you for using ACCESS.');
=======
    addToast('success', 'Journey concluded successfully!');
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
  };

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145],
    [20.3570, 85.8170],
    [20.3530, 85.8160],
    [20.3450, 85.8180],
  ];

  return (
<<<<<<< HEAD
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-2xl shadow-md border border-gray-200 gap-4">
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Active Journey
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mt-0.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping"></span>
            En Route to {activeJourney.destinationName}
          </h1>
          <div className="text-xs text-gray-500 mt-1">
            Origin: {activeJourney.originName} • Route: {activeJourney.routeName}
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase">Estimated Arrival</div>
            <div className="text-xl font-extrabold text-primary-600">
              {activeJourney.duration} mins
            </div>
          </div>
          <Button
            variant="outline"
            className="border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
            onClick={handleSafeCheckIn}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Check-in (I'm Safe)
=======
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top HUD Banner */}
      <div className="bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-white/15 p-6 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Active Transit</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">{activeJourney.routeName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Heading to {activeJourney.destinationName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowCompleteModal(true)}>
            <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-400" /> End Journey
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowEmergencyModal(true)}>
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Emergency
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
          </Button>
        </div>
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Progress & Safety Controls */}
        <div className="lg:col-span-4 space-y-5">
          {/* Proactive Safety Panel */}
          {activeJourney.safetySession && (
            <Card
              className={`p-5 rounded-2xl border shadow-md ${
                activeJourney.safetySession.status === 'EMERGENCY'
                  ? 'bg-red-50 border-red-200 ring-2 ring-red-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-primary-600" />
                  Safety Monitoring Active
                </h3>
                <SafetyStatusBadge status={activeJourney.safetySession.status} />
              </div>

              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Heartbeat check-in timer is monitoring your progress. If you do not check in past your expected arrival time, your emergency contact will be notified automatically.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={handleSafeCheckIn}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> I Am Safe
                </Button>
                <Button
                  onClick={() => setShowEmergencyModal(true)}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 font-semibold text-xs py-2.5 rounded-xl"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> SOS Emergency
                </Button>
              </div>
            </Card>
          )}

          {/* Turn-by-Turn Leg Steps */}
          <Card className="p-5 rounded-2xl border border-gray-200 bg-white shadow-md">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center text-sm gap-2">
              <Navigation className="w-4 h-4 text-primary-600" /> Journey Directions
            </h3>

            <div className="space-y-3">
              {activeJourney.turnByTurn && activeJourney.turnByTurn.length > 0 ? (
                activeJourney.turnByTurn.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2 bg-gray-50 rounded-xl border border-gray-100 text-xs"
                  >
                    <div className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                      {idx + 1}
                    </div>
                    <div className="text-gray-800 font-medium leading-tight">{step}</div>
                  </div>
                ))
              ) : (
                activeJourney.segments.map((segment, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2 bg-gray-50 rounded-xl border border-gray-100 text-xs"
                  >
                    <div className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
                      {idx + 1}
                    </div>
                    <div className="text-gray-800 font-medium leading-tight">
                      <span className="font-bold capitalize">{segment.type}</span> to {segment.to} ({segment.duration} min)
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <Button
                onClick={() => setShowCompleteModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm h-11 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Arrived & Complete Journey
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Real-time Live Google Maps Style Navigation */}
        <div className="lg:col-span-8">
          <Card className="p-0 overflow-hidden h-[620px] rounded-2xl border border-gray-200 shadow-xl relative">
            <MapContainer
              center={currentVehiclePos}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsFitter points={fullRoutePoints} />

              {/* Origin Marker */}
              {activeJourney.originCoords && (
                <Marker
                  position={[activeJourney.originCoords.lat, activeJourney.originCoords.lng]}
                  icon={originIcon}
                >
                  <Popup>
                    <strong>Origin</strong>: {activeJourney.originName}
                  </Popup>
                </Marker>
              )}

              {/* Destination Marker */}
              {activeJourney.destinationCoords && (
                <Marker
                  position={[activeJourney.destinationCoords.lat, activeJourney.destinationCoords.lng]}
                  icon={destIcon}
                >
                  <Popup>
                    <strong>Destination</strong>: {activeJourney.destinationName}
                  </Popup>
                </Marker>
              )}

              {/* Live Moving Vehicle Marker */}
              <Marker position={currentVehiclePos} icon={busLiveIcon}>
                <Popup>
                  <div className="text-xs font-semibold">
                    <div className="text-emerald-700 font-bold flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5" /> {activeJourney.routeName} (Live GPS)
                    </div>
                    <div className="text-gray-500 mt-1">Status: On Schedule • Low Crowding</div>
                  </div>
                </Popup>
              </Marker>

              {/* Walk to Board Polyline (Blue Dashed) */}
              {activeJourney.geometry?.originToBoardWalk &&
                activeJourney.geometry.originToBoardWalk.length > 0 && (
                  <Polyline
                    positions={activeJourney.geometry.originToBoardWalk}
                    pathOptions={{ color: '#2563EB', weight: 4, dashArray: '6, 6', opacity: 0.8 }}
                  />
                )}

              {/* Main Transit Road Curve (Solid Vibrant Emerald/Primary Line) */}
              {activeJourney.geometry?.transitPath &&
                activeJourney.geometry.transitPath.length > 0 && (
                  <Polyline
                    positions={activeJourney.geometry.transitPath}
                    pathOptions={{ color: '#059669', weight: 6, opacity: 0.95 }}
                  />
                )}

              {/* Walk to Destination Polyline (Red Dashed) */}
              {activeJourney.geometry?.alightToDestWalk &&
                activeJourney.geometry.alightToDestWalk.length > 0 && (
                  <Polyline
                    positions={activeJourney.geometry.alightToDestWalk}
                    pathOptions={{ color: '#DC2626', weight: 4, dashArray: '6, 6', opacity: 0.8 }}
                  />
                )}

              {/* Intermediate Stop Markers */}
              {(activeJourney.intermediateStops || []).map((stop, idx) => (
                <Marker
                  key={idx}
                  position={[stop.latitude, stop.longitude]}
                  icon={stopMarkerIcon}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{stop.name}</strong>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Card>
        </div>
      </div>

      {/* SOS Emergency Modal */}
      <Modal open={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title="Activate Emergency Mode?">
        <div className="p-4 space-y-4">
          <div className="bg-red-50 p-4 rounded-xl text-red-800 border border-red-200 flex gap-3 text-xs leading-relaxed">
            <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
            <p>
              This will notify your registered emergency contacts with your live GPS location and generate an in-app emergency escalation event.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowEmergencyModal(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleEmergency}>
              Confirm SOS Alert
            </Button>
=======
      {/* Main Grid: Turn-by-turn + Safety HUD + Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Turn-by-Turn Timeline (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Proactive Safety HUD */}
          <div className="bg-dark-900/90 border border-emerald-500/30 rounded-3xl p-5 shadow-glow-green backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-400 animate-heartbeat" />
                <span className="font-bold text-white text-sm">Safety Heartbeat Watchdog</span>
              </div>
              {activeJourney.safetySession && (
                <SafetyStatusBadge status={activeJourney.safetySession.status} />
              )}
            </div>

            <p className="text-xs text-slate-300">
              Next safety confirmation due in: <strong className="text-emerald-400 font-mono text-sm">{heartbeatTime}s</strong>
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button variant="primary" size="sm" onClick={handleSafeCheckIn} className="w-full">
                <UserCheck className="w-4 h-4 mr-1.5" /> I'm Safe
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEmergencyModal(true)} className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10">
                <ShieldAlert className="w-4 h-4 mr-1.5" /> SOS Help
              </Button>
            </div>
          </div>

          {/* Turn-by-Turn Timeline */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400" /> Route Segment Timeline
            </h3>

            <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
              {activeJourney.segments.map((segment, idx) => {
                const isCurrent = idx === activeJourney.currentSegmentIndex;
                const isDone = idx < activeJourney.currentSegmentIndex;
                return (
                  <div key={idx} className="relative flex items-start gap-4 pl-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                      isCurrent
                        ? 'bg-emerald-500 text-dark-950 shadow-glow-green animate-pulse'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-dark-950 text-slate-500 border border-white/10'
                    }`}>
                      {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm font-bold ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                          {segment.from} → {segment.to}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">{segment.duration} min</span>
                      </div>
                      <span className="text-xs text-slate-400 block capitalize">
                        {segment.type} • {segment.accessible ? '♿ Accessible' : 'Standard'}
                      </span>
                      {segment.notes && (
                        <p className="text-[11px] text-emerald-300/80 mt-1 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                          {segment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Map (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-dark-900/80 backdrop-blur-2xl border border-white/15 p-5 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Position</span>
                <h3 className="text-base font-bold text-white">Campus Corridor Telemetry</h3>
              </div>
              <div className="flex items-center gap-2">
                <DelayBadge delay={activeJourney.delay} />
                <CrowdingIndicator level={activeJourney.crowding} />
              </div>
            </div>

            <div className="h-80 sm:h-[420px] w-full rounded-2xl overflow-hidden border border-white/15">
              <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={false} className="w-full h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline positions={polylineCoords} color="#10b981" weight={6} opacity={0.9} />
                <Marker position={[20.3555, 85.8145]}>
                  <Popup><strong className="text-dark-950">Campus Gate</strong><br />Boarded C3</Popup>
                </Marker>
                <Marker position={[20.3530, 85.8160]}>
                  <Popup><strong className="text-dark-950">Current Position</strong><br />Bus C3-01 in transit</Popup>
                </Marker>
                <Marker position={[20.3450, 85.8180]}>
                  <Popup><strong className="text-dark-950">Patia Station</strong><br />Arrival point</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      <Modal open={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title="Activate Emergency Alert">
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200 space-y-1">
              <strong className="text-white text-sm block">Immediate Safety Protocol</strong>
              <p>Activating this will transmit your live GPS coordinates to your designated emergency contact (<strong>Priya: +91 98765 43210</strong>) and the campus transit security dispatch.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowEmergencyModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleEmergency}>Confirm & Send Emergency Alert</Button>
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
          </div>
        </div>
      </Modal>

<<<<<<< HEAD
      {/* Complete Journey & Crowding Feedback Modal */}
      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Journey Completed">
        <div className="p-4 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">You've arrived at your destination!</h3>
          <p className="text-xs text-gray-500">
            How crowded was your transit trip? Your answer improves real-time crowding estimates for all accessibility passengers.
          </p>

          <div className="flex justify-center gap-2 my-3">
            {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setCrowdingFeedback(level)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  crowdingFeedback === level
                    ? 'bg-primary-600 text-white border-primary-600 shadow'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {level === 'LOW' ? '🟢 Low / Seats Empty' : level === 'MEDIUM' ? '🟡 Moderate' : '🔴 Very Crowded'}
              </button>
            ))}
          </div>

          <Button
            onClick={handleComplete}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            disabled={isSubmittingFeedback}
          >
            {isSubmittingFeedback ? 'Submitting Feedback...' : 'Done & Submit'}
          </Button>
=======
      {/* Complete Journey Modal */}
      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Conclude Transit Journey">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you have arrived at your destination (<strong>{activeJourney.destinationName}</strong>)?
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">How was your trip accessibility?</span>
            <div className="flex gap-2">
              {['Seamless ♿', 'Good 👍', 'Obstacles Encountered ⚠️'].map((f, i) => (
                <button key={i} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 text-xs font-semibold text-slate-200 hover:text-emerald-300 transition-all">
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>Keep Traveling</Button>
            <Button variant="primary" onClick={handleComplete}>Finish & Save Trip</Button>
          </div>
>>>>>>> b24a306da39029be9e5ed543721da1c53e991793
        </div>
      </Modal>
    </div>
  );
}
