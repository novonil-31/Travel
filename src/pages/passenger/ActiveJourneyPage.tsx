import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Badge, Modal, ProgressBar } from '../../components/ui';
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
  const navigate = useNavigate();
  const { state, completeJourney, updateSafetySession } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [heartbeatTime, setHeartbeatTime] = useState<number>(30);

  // Heartbeat countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeatTime(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!activeJourney) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-neutral-900">No Active Trip</h2>
        <p className="text-sm text-neutral-600">Plan a route to start turn-by-turn navigation and safety check-ins.</p>
        <Button onClick={() => navigate('/plan')} size="lg">
          <Navigation className="w-4 h-4 mr-2" /> Plan a Journey
        </Button>
      </div>
    );
  }

  const handleSafeCheckIn = () => {
    if (activeJourney.safetySession) {
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

  const handleEmergency = () => {
    if (activeJourney.safetySession) {
      const updated: SafetySession = {
        ...activeJourney.safetySession,
        status: 'EMERGENCY',
        emergencyContactNotified: true,
      };
      updateSafetySession(updated);
      setShowEmergencyModal(false);
      addToast('error', 'Emergency mode active. Emergency contacts and transit dispatch notified.');
    }
  };

  const handleComplete = () => {
    completeJourney();
    setShowCompleteModal(false);
    navigate('/journeys');
    addToast('success', 'Journey concluded successfully!');
  };

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145],
    [20.3570, 85.8170],
    [20.3530, 85.8160],
    [20.3450, 85.8180],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Top HUD Banner */}
      <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Live Trip In Progress</span>
            <span className="text-neutral-300">•</span>
            <span className="text-xs text-neutral-700 font-semibold">{activeJourney.routeName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Heading to {activeJourney.destinationName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowCompleteModal(true)}>
            <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-700" /> End Trip
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowEmergencyModal(true)}>
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Emergency SOS
          </Button>
        </div>
      </div>

      {/* Main Grid: Turn-by-turn + Safety HUD + Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Turn-by-Turn & Safety HUD (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Proactive Safety HUD */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-700" />
                <span className="font-bold text-neutral-900 text-sm">Safety Heartbeat Watchdog</span>
              </div>
              {activeJourney.safetySession && (
                <SafetyStatusBadge status={activeJourney.safetySession.status} />
              )}
            </div>

            <p className="text-xs text-neutral-600">
              Next safety confirmation due in: <strong className="text-neutral-900 font-mono text-sm">{heartbeatTime}s</strong>
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" onClick={handleSafeCheckIn} className="w-full">
                <UserCheck className="w-4 h-4 mr-1.5" /> I'm Safe
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEmergencyModal(true)} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                <ShieldAlert className="w-4 h-4 mr-1.5" /> SOS Help
              </Button>
            </div>
          </div>

          {/* Turn-by-Turn Timeline */}
          <Card className="p-6 space-y-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
              Trip Itinerary
            </span>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
              {activeJourney.segments.map((segment, idx) => {
                const isCurrent = idx === activeJourney.currentSegmentIndex;
                const isDone = idx < activeJourney.currentSegmentIndex;
                return (
                  <div key={idx} className="relative flex items-start gap-3.5 pl-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                      isCurrent
                        ? 'bg-black text-white'
                        : isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {isDone ? '✓' : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm font-bold ${isCurrent ? 'text-black' : 'text-neutral-800'}`}>
                          {segment.from} → {segment.to}
                        </span>
                        <span className="text-xs text-neutral-500 ml-2">{segment.duration} min</span>
                      </div>
                      <span className="text-xs text-neutral-500 block capitalize">
                        {segment.type} • {segment.accessible ? '♿ Accessible' : 'Standard'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Map (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-neutral-200 p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Live Route Map</span>
                <h3 className="text-base font-bold text-neutral-900">Campus Corridor Telemetry</h3>
              </div>
              <div className="flex items-center gap-2">
                <DelayBadge delay={activeJourney.delay} />
                <CrowdingIndicator level={activeJourney.crowding} />
              </div>
            </div>

            <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-neutral-200">
              <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={false} className="w-full h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline positions={polylineCoords} color="#000000" weight={5} opacity={0.85} />
                <Marker position={[20.3555, 85.8145]}>
                  <Popup><strong>Campus Gate</strong><br />Boarded Bus</Popup>
                </Marker>
                <Marker position={[20.3530, 85.8160]}>
                  <Popup><strong>Current Position</strong><br />Bus C3-01 in transit</Popup>
                </Marker>
                <Marker position={[20.3450, 85.8180]}>
                  <Popup><strong>Patia Station</strong><br />Arrival point</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      <Modal open={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title="Activate Emergency SOS">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 space-y-1">
              <strong className="block font-bold">Emergency Protocol</strong>
              <p>Your live location will be shared immediately with your emergency contact (<strong>Priya: +91 98765 43210</strong>) and transit security.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEmergencyModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleEmergency}>Confirm & Send Emergency Alert</Button>
          </div>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="End Transit Trip">
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Have you safely arrived at <strong className="text-neutral-900">{activeJourney.destinationName}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>Keep Traveling</Button>
            <Button variant="primary" onClick={handleComplete}>Finish Trip</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
