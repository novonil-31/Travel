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
  const [heartbeatTime, setHeartbeatTime] = useState<number>(30); // 30s demo timer

  // Heartbeat countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeatTime(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!activeJourney) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mx-auto animate-float">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">No Active Journey</h2>
        <p className="text-sm text-slate-400">Plan a route to start real-time accessible tracking and safety check-ins.</p>
        <Button onClick={() => navigate('/plan')} size="lg" className="shadow-glow-green">
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
          </Button>
        </div>
      </div>

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
          </div>
        </div>
      </Modal>

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
        </div>
      </Modal>
    </div>
  );
}
