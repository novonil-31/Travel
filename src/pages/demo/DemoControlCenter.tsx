import React from 'react';
import { Card, Button } from '../../components/ui';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Link } from 'react-router-dom';
import { Play, RotateCcw, AlertTriangle, Users, ShieldAlert, CheckCircle, Smartphone, MapPin } from 'lucide-react';

export default function DemoControlCenter() {
  const { 
    state, 
    resetDemo, 
    updateCondition, 
    addNotification, 
    addReport, 
    updateSafetySession,
    completeJourney
  } = useAppStore();
  const { addToast } = useToast();

  const handleReset = () => {
    resetDemo();
    addToast('success', 'Demo reset to initial state');
  };

  const simulateDelay = () => {
    updateCondition('C2', { delay: 8, vehicleStatus: 'delayed' });
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'delay',
      title: 'Delay on Route C2',
      message: 'The C2 shuttle is currently experiencing an 8-minute delay due to traffic.',
      routeId: 'C2'
    });
    addToast('warning', 'Injected 8m delay on Route C2');
  };

  const simulateCrowding = () => {
    updateCondition('C2', { crowding: 'HIGH' });
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'crowding',
      title: 'High Crowding on Route C2',
      message: 'Route C2 is currently experiencing high crowding levels.',
      routeId: 'C2'
    });
    addToast('error', 'Injected HIGH crowding on Route C2');
  };

  const simulateAccessibilityFail = () => {
    updateCondition('C2', { accessibility: 'UNAVAILABLE' });
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'accessibility',
      title: 'Accessibility Alert: Route C2',
      message: 'The wheelchair ramp on the current C2 vehicle is out of service.',
      routeId: 'C2'
    });
    addToast('error', 'Injected Accessibility Failure on Route C2');
  };

  const triggerSafetyCheckin = () => {
    updateSafetySession({ status: 'CHECK_IN_DUE' });
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'safety',
      title: 'Safety Check-in Required',
      message: 'Please confirm you are okay. We noticed your journey is taking longer than expected.',
      actionUrl: '/journey',
      actionLabel: 'Check In Now'
    });
    addToast('info', 'Triggered Safety Check-in prompt');
  };

  const sendCustomNotification = () => {
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'system',
      title: 'Platform Elevator Outage',
      message: 'The elevator at Central Hub Platform 3 is out of service. Alternate routing is in effect.',
    });
    addToast('success', 'System notification sent');
  };

  const createReport = () => {
    addReport({
      id: `rep-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'NEW',
      type: 'accessibility',
      routeId: 'C3',
      routeName: 'C3 - Express',
      reportedBy: 'Demo User',
      accessibilityIssue: 'Platform gap is too wide for manual wheelchair today',
      comment: 'Very difficult to board at Station Square'
    });
    addToast('success', 'Passenger report generated');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo Control Center</h1>
          <p className="text-gray-600">Trigger events, update conditions, and control the demo narrative.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleReset} className="flex items-center">
            <RotateCcw size={16} className="mr-2" /> Reset Demo
          </Button>
          <Link to="/demo/pitch">
            <Button className="flex items-center bg-indigo-600 hover:bg-indigo-700">
              <Play size={16} className="mr-2" /> Presentation Mode
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center mb-4 text-amber-600">
            <AlertTriangle className="mr-2" />
            <h2 className="text-lg font-bold">Inject Delays</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 h-10">Simulate a sudden delay on the main recommended route.</p>
          <Button className="w-full" variant="outline" onClick={simulateDelay}>Simulate C2 Delay</Button>
        </Card>

        <Card className="p-6 border-l-4 border-l-red-500">
          <div className="flex items-center mb-4 text-red-600">
            <Users className="mr-2" />
            <h2 className="text-lg font-bold">Inject Crowding</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 h-10">Spike the crowding levels on a specific route.</p>
          <Button className="w-full" variant="outline" onClick={simulateCrowding}>Simulate C2 Crowding</Button>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center mb-4 text-purple-600">
            <ShieldAlert className="mr-2" />
            <h2 className="text-lg font-bold">Accessibility Failure</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 h-10">Simulate an infrastructure failure (e.g., broken ramp).</p>
          <Button className="w-full" variant="outline" onClick={simulateAccessibilityFail}>Break C2 Accessibility</Button>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center mb-4 text-green-600">
            <Smartphone className="mr-2" />
            <h2 className="text-lg font-bold">Safety Module</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 h-10">Force a safety check-in prompt for the active user journey.</p>
          <Button className="w-full" variant="outline" onClick={triggerSafetyCheckin} disabled={!state.activeJourney}>Trigger Check-in</Button>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center mb-4 text-blue-600">
            <MapPin className="mr-2" />
            <h2 className="text-lg font-bold">Crowdsourcing</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 h-10">Generate a live user report on the operator dashboard.</p>
          <Button className="w-full" variant="outline" onClick={createReport}>Create Passenger Report</Button>
        </Card>

        <Card className="p-6 border-l-4 border-l-gray-800">
          <div className="flex items-center mb-4 text-gray-800">
            <CheckCircle className="mr-2" />
            <h2 className="text-lg font-bold">Journey Flow</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 h-10">End the current active journey successfully.</p>
          <Button className="w-full" variant="outline" onClick={completeJourney} disabled={!state.activeJourney}>Complete Journey</Button>
        </Card>
      </div>

      <Card className="p-6 mt-8 bg-gray-50">
        <h3 className="font-bold text-gray-900 mb-4">Current Demo State Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-white rounded border">
            <span className="block text-gray-500 text-xs uppercase mb-1">Active Journey</span>
            <span className="font-bold text-gray-900">{state.activeJourney ? 'Yes' : 'No'}</span>
          </div>
          <div className="p-3 bg-white rounded border">
            <span className="block text-gray-500 text-xs uppercase mb-1">Safety Status</span>
            <span className="font-bold text-gray-900">{state.activeJourney?.safetySession?.status || 'Inactive'}</span>
          </div>
          <div className="p-3 bg-white rounded border">
            <span className="block text-gray-500 text-xs uppercase mb-1">Active Reports</span>
            <span className="font-bold text-gray-900">{state.reports.length}</span>
          </div>
          <div className="p-3 bg-white rounded border">
            <span className="block text-gray-500 text-xs uppercase mb-1">Notifications</span>
            <span className="font-bold text-gray-900">{state.notifications.length}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
