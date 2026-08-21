import React from 'react';
import { Card, Button } from '../../components/ui';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Play, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

import { DEMO_SEARCH_RESULTS } from '../../data/mock';

export function WheelchairDemo() {
  const { startJourney, resetDemo } = useAppStore();
  const { addToast } = useToast();

  const handleStart = () => {
    resetDemo();
    startJourney(DEMO_SEARCH_RESULTS[0]);
    addToast('success', 'Journey started on recommended Route C3');
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto text-center space-y-6">
      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Play size={32} />
      </div>
      <h2 className="text-2xl font-bold">Scenario 1: Profile-Based Routing</h2>
      <p className="text-gray-600 text-lg">
        Start a journey as a wheelchair user. The system will recommend Route C3 (18m) over the faster Route C1 (12m) because it is fully accessible and avoids stairs.
      </p>
      <div className="pt-6">
        <Button size="lg" onClick={handleStart} className="w-full sm:w-auto">Start Journey</Button>
      </div>
    </Card>
  );
}

export function LiveDelayDemo() {
  const { updateCondition, addNotification } = useAppStore();
  const { addToast } = useToast();

  const handleInject = () => {
    updateCondition('C3', { delay: 15, vehicleStatus: 'delayed' });
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'delay',
      title: 'Major Delay on C3',
      message: 'Route C3 is experiencing a 15-minute delay.',
      routeId: 'C3'
    });
    addToast('warning', 'Delay injected on Route C3');
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto text-center space-y-6 border-t-4 border-t-amber-500">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-bold">Scenario 2: Live Condition Updates</h2>
      <p className="text-gray-600 text-lg">
        Inject a 15-minute delay on the active route. The app will immediately notify the user and suggest re-evaluating the route.
      </p>
      <div className="pt-6">
        <Button size="lg" variant="outline" onClick={handleInject} className="w-full sm:w-auto border-amber-500 text-amber-700 hover:bg-amber-50">Inject 15m Delay</Button>
      </div>
    </Card>
  );
}

export function CrowdingDemo() {
  const { updateCondition, addNotification } = useAppStore();
  const { addToast } = useToast();

  const handleInject = () => {
    updateCondition('C3', { crowding: 'HIGH' });
    addNotification({
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'crowding',
      title: 'High Crowding Alert',
      message: 'The upcoming vehicle on Route C3 is reporting high crowding. Space for mobility aids may be limited.',
      routeId: 'C3'
    });
    addToast('error', 'Crowding injected on Route C3');
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto text-center space-y-6 border-t-4 border-t-red-500">
      <h2 className="text-2xl font-bold">Scenario 3: Crowding Warning</h2>
      <p className="text-gray-600 text-lg">
        Spike the crowding levels. For a wheelchair user, high crowding means they might not be able to board.
      </p>
      <div className="pt-6">
        <Button size="lg" variant="outline" onClick={handleInject} className="w-full sm:w-auto border-red-500 text-red-700 hover:bg-red-50">Simulate High Crowding</Button>
      </div>
    </Card>
  );
}

export function SafetyDemo() {
  const { updateSafetySession, addNotification } = useAppStore();
  const { addToast } = useToast();

  const handleInject = () => {
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
    addToast('info', 'Safety check-in triggered');
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto text-center space-y-6 border-t-4 border-t-green-500">
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldAlert size={32} />
      </div>
      <h2 className="text-2xl font-bold">Scenario 4: Proactive Safety</h2>
      <p className="text-gray-600 text-lg">
        Trigger a safety check-in. This simulates the system noticing anomalous journey behavior and proactively reaching out to the user.
      </p>
      <div className="pt-6">
        <Button size="lg" variant="outline" onClick={handleInject} className="w-full sm:w-auto border-green-500 text-green-700 hover:bg-green-50">Trigger Safety Check-in</Button>
      </div>
    </Card>
  );
}

export function ReportingDemo() {
  const { completeJourney } = useAppStore();
  const { addToast } = useToast();

  const handleComplete = () => {
    completeJourney();
    addToast('success', 'Journey completed successfully');
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto text-center space-y-6 border-t-4 border-t-blue-500">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold">Scenario 5: Journey Completion</h2>
      <p className="text-gray-600 text-lg">
        Complete the journey and show the post-trip summary and contribution prompts.
      </p>
      <div className="pt-6">
        <Button size="lg" onClick={handleComplete} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">Complete Journey</Button>
      </div>
    </Card>
  );
}

export default function DemoScenarioPages() {
  return (
    <div className="space-y-12 pb-16">
      <div className="text-center py-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Interactive Scenarios</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">Trigger these events to walk through the core features of the ACCESS platform during a live presentation.</p>
      </div>
      
      <WheelchairDemo />
      <LiveDelayDemo />
      <CrowdingDemo />
      <SafetyDemo />
      <ReportingDemo />
    </div>
  );
}
