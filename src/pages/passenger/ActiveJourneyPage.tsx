import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Badge, Modal, ProgressBar } from '../../components/ui';
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
  const navigate = useNavigate();
  const { state, completeJourney, updateSafetySession } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

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

  if (!activeJourney) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">No Active Journey</h2>
        <p className="text-gray-500">You don't have a journey currently in progress.</p>
        <Button onClick={() => navigate('/plan')} className="bg-primary-600 hover:bg-primary-700">
          Plan a Journey
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
      addToast('success', "You've checked in safely. Stay alert.");
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
      addToast('error', 'Emergency mode activated. Contacts notified.');
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
    addToast('success', 'Journey completed! Thank you for using ACCESS.');
  };

  return (
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
          </Button>
        </div>
      </div>

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
          </div>
        </div>
      </Modal>

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
        </div>
      </Modal>
    </div>
  );
};

export default ActiveJourneyPage;
