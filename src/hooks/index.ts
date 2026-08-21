import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { useToast } from '../store/ToastContext';
import type { LiveEvent, SafetyStatus } from '../types';

// ============ Live Transport Updates ============
// Abstracts WebSocket/polling behind a single hook
export function useLiveTransportUpdates() {
  const { state, triggerEvent, addNotification } = useAppStore();
  const { addToast } = useToast();

  const processEvent = useCallback((event: LiveEvent) => {
    triggerEvent(event as unknown as { type: string; [key: string]: unknown });

    // Generate notifications based on events
    switch (event.type) {
      case 'ROUTE_DELAY_UPDATED':
        addNotification({
          id: `notif-${Date.now()}`,
          type: 'delay',
          title: `Route ${event.routeId} delayed`,
          message: `${event.routeId} is currently ${event.delay} minutes late.`,
          timestamp: new Date().toISOString(),
          read: false,
          routeId: event.routeId,
        });
        addToast('warning', `Route ${event.routeId} delayed by ${event.delay} min`);
        break;
      case 'CROWDING_UPDATED':
        addNotification({
          id: `notif-${Date.now()}`,
          type: 'crowding',
          title: `Crowding update on ${event.routeId}`,
          message: `${event.routeId} crowding is now ${event.crowding}.`,
          timestamp: new Date().toISOString(),
          read: false,
          routeId: event.routeId,
        });
        addToast('info', `${event.routeId} crowding: ${event.crowding}`);
        break;
    }
  }, [triggerEvent, addNotification, addToast]);

  return { processEvent };
}

// ============ Safety Check-in Timer ============
export function useSafetyCheckIn() {
  const { state, updateSafetySession } = useAppStore();
  const { addToast } = useToast();
  const timerRef = useRef<any>(null);

  const session = state.activeJourney?.safetySession;

  const checkIn = useCallback(() => {
    updateSafetySession({
      status: 'SAFE' as SafetyStatus,
      lastCheckIn: new Date().toISOString(),
      nextCheckInDue: new Date(Date.now() + 10 * 60000).toISOString(),
    });
    addToast('success', 'Safety check-in completed');
  }, [updateSafetySession, addToast]);

  const triggerOverdue = useCallback(() => {
    updateSafetySession({ status: 'OVERDUE' as SafetyStatus });
    addToast('error', 'Safety check-in overdue!');
  }, [updateSafetySession, addToast]);

  const triggerEmergency = useCallback(() => {
    updateSafetySession({
      status: 'EMERGENCY' as SafetyStatus,
      emergencyContactNotified: true,
    });
    addToast('error', 'Emergency assistance requested');
  }, [updateSafetySession, addToast]);

  const complete = useCallback(() => {
    updateSafetySession({ status: 'COMPLETED' as SafetyStatus });
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [updateSafetySession]);

  // Simulate timer for demo
  useEffect(() => {
    if (session?.status === 'ACTIVE' && session.nextCheckInDue) {
      const dueTime = new Date(session.nextCheckInDue).getTime();
      const now = Date.now();
      const remaining = dueTime - now;

      if (remaining > 0) {
        timerRef.current = setTimeout(() => {
          updateSafetySession({ status: 'CHECK_IN_DUE' });
        }, Math.min(remaining, 30000)); // Cap at 30s for demo
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [session?.status, session?.nextCheckInDue, updateSafetySession]);

  return { session, checkIn, triggerOverdue, triggerEmergency, complete };
}

// ============ Offline Detection ============
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

// ============ Time-based Greeting ============
export function useGreeting(name?: string) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${greeting}, ${name}` : greeting;
}

// ============ Relative Time ============
export function useRelativeTime(timestamp: string) {
  const [relative, setRelative] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
      if (diff < 60) setRelative(`${diff}s ago`);
      else if (diff < 3600) setRelative(`${Math.floor(diff / 60)}m ago`);
      else if (diff < 86400) setRelative(`${Math.floor(diff / 3600)}h ago`);
      else setRelative(new Date(timestamp).toLocaleDateString());
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return relative;
}
