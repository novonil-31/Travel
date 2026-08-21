import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Badge, Modal, ProgressBar } from '../../components/ui';
import { SafetyStatusBadge } from '../../components/accessibility';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, ShieldAlert, Navigation, CheckCircle, MapPin } from 'lucide-react';
import type { SafetySession } from '../../types';

const ActiveJourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, completeJourney, updateSafetySession } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  if (!activeJourney) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <Navigation className="w-16 h-16 text-gray-300 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">No Active Journey</h2>
        <p className="text-gray-500">You don't have a journey currently in progress.</p>
        <Button onClick={() => navigate('/plan')}>Plan a Journey</Button>
      </div>
    );
  }

  const handleSafeCheckIn = () => {
    if (activeJourney.safetySession) {
      const updated: SafetySession = {
        ...activeJourney.safetySession,
        status: 'SAFE',
        lastCheckIn: new Date().toISOString()
      };
      updateSafetySession(updated);
      addToast('success', "You've checked in safely. Stay alert.");
    }
  };

  const handleEmergency = () => {
    if (activeJourney.safetySession) {
      const updated: SafetySession = {
        ...activeJourney.safetySession,
        status: 'EMERGENCY',
        emergencyContactNotified: true
      };
      updateSafetySession(updated);
      setShowEmergencyModal(false);
      addToast('error', "Emergency mode activated. Contacts notified.");
    }
  };

  const handleComplete = () => {
    completeJourney();
    setShowCompleteModal(false);
    navigate('/journeys');
    addToast('success', "Journey completed! Thank you for using ACCESS.");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="text-sm text-gray-500">Destination</div>
          <h1 className="text-2xl font-bold text-gray-900">{activeJourney.destinationName}</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">ETA</div>
          <div className="text-xl font-bold text-primary-600">{activeJourney.eta || '--:--'}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-5 border-t-4 border-t-primary-500">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-primary-600" /> Journey Progress
            </h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {activeJourney.segments.map((segment, idx) => {
                const isActive = idx === activeJourney.currentSegmentIndex;
                const isPast = idx < activeJourney.currentSegmentIndex;
                return (
                  <div key={idx} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active ${isActive ? 'text-primary-600' : isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white z-10 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isActive ? 'bg-primary-500 text-white' : isPast ? 'bg-gray-200' : 'bg-slate-100'}`}>
                       {isPast ? <CheckCircle className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 shadow-sm bg-white">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900">{segment.type === 'walk' ? 'Walk' : segment.routeName}</div>
                        <time className="font-caveat font-medium text-amber-500">{segment.duration}m</time>
                      </div>
                      <div className="text-sm text-slate-500">To {segment.to}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button onClick={() => setShowCompleteModal(true)} variant="outline" className="w-full">End Journey Early</Button>
            </div>
          </Card>

          {activeJourney.safetySession && (
            <Card className={`p-5 ${activeJourney.safetySession.status === 'EMERGENCY' ? 'bg-red-50 border-red-200' : ''}`}>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" /> Safety Check-in
              </h3>
              <div className="mb-4">
                <SafetyStatusBadge status={activeJourney.safetySession.status} />
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleSafeCheckIn}
                  className="bg-green-600 hover:bg-green-700 text-white border-transparent"
                >
                  <Shield className="w-4 h-4 mr-2" /> I'm Safe
                </Button>
                <Button 
                  onClick={() => setShowEmergencyModal(true)}
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <ShieldAlert className="w-4 h-4 mr-2" /> Emergency Help
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          <Card className="p-0 overflow-hidden h-[600px] border-gray-200">
            <MapContainer center={[20.3500, 85.8150]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </MapContainer>
          </Card>
        </div>
      </div>

      <Modal open={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} title="Activate Emergency Mode?">
        <div className="p-4 space-y-4">
          <div className="bg-red-50 p-4 rounded text-red-800 border border-red-200 flex gap-3">
             <ShieldAlert className="w-6 h-6 flex-shrink-0" />
             <p>This will notify your emergency contacts with your live location and alert local authorities if necessary.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowEmergencyModal(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleEmergency}>Confirm Emergency</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete Journey">
        <div className="p-4 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-bold">You've arrived!</h3>
          <p className="text-gray-500">How was your journey today?</p>
          <div className="flex justify-center gap-2 my-4">
             {/* Star rating placeholder */}
             {[1,2,3,4,5].map(i => <div key={i} className="w-8 h-8 rounded bg-gray-100 hover:bg-yellow-100 cursor-pointer flex items-center justify-center text-xl">⭐</div>)}
          </div>
          <Button onClick={handleComplete} className="w-full">Done</Button>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveJourneyPage;
