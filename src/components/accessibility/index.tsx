import React from 'react';
import { Shield, Clock, Users, Accessibility, CheckCircle, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import type { AccessibilityProfile, CrowdingLevel, AccessibilityStatus } from '../../types';

// ============ CROWDING INDICATOR ============
export function CrowdingIndicator({ level, showLabel = true }: { level?: CrowdingLevel; showLabel?: boolean }) {
  const config: Record<CrowdingLevel, { color: string; bg: string; border: string; text: string }> = {
    LOW: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Low Crowding' },
    MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Moderate' },
    HIGH: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'Crowded' },
  };
  const c = (level && config[level]) || config.LOW;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
      {profile.mobility === 'wheelchair' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
          ♿ Wheelchair
        </span>
      )}
      {profile.mobility === 'walking-difficulty' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
          🦯 Walking Aid
        </span>
      )}
      {profile.mobility === 'elderly' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200">
          👵 Senior
        </span>
      )}
      {profile.stairs === 'avoid' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          0 Stairs
        </span>
      )}
      {profile.crowding === 'avoid' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-700 border border-neutral-200">
          Low Crowding
        </span>
      )}
    </div>
  );
}

// ============ DELAY BADGE ============
export function DelayBadge({ delay = 0 }: { delay?: number }) {
  if (delay <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200" role="status">
        <Clock className="w-3.5 h-3.5" />
        On Time
      </span>
    );
  }
  const isHigh = delay >= 8;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}

// ============ VEHICLE ACCESSIBILITY BADGE ============
export function VehicleAccessibilityBadge({ status }: { status?: AccessibilityStatus | boolean }) {
  const s = typeof status === 'boolean' ? (status ? 'AVAILABLE' : 'UNAVAILABLE') : (status || 'AVAILABLE');
  const config: Record<AccessibilityStatus, { color: string; bg: string; border: string; text: string }> = {
    AVAILABLE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Wheelchair Ramp' },
    LIMITED: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Assistance Needed' },
    UNAVAILABLE: { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'Standard Access' },
  };
  const c = config[s] || config.AVAILABLE;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
      isOk ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'
    }`}>
      ♿ {isOk ? 'Electric Ramp' : 'Standard'}
    </span>
  );
}

// ============ SAFETY STATUS ============
export function SafetyStatusBadge({ status }: { status?: SafetyStatus }) {
  const config: Record<SafetyStatus, { color: string; bg: string; border: string; icon: React.ReactNode; text: string }> = {
    NOT_STARTED: { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Safety Inactive' },
    ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <HeartPulse className="w-3.5 h-3.5" />, text: 'Watchdog Active' },
    CHECK_IN_DUE: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Check-in Due' },
    OVERDUE: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Overdue Alert' },
    SAFE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Verified Safe' },
    EMERGENCY: { color: 'text-white', bg: 'bg-red-600', border: 'border-red-600', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'EMERGENCY' },
    COMPLETED: { color: 'text-neutral-700', bg: 'bg-neutral-100', border: 'border-neutral-200', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Concluded' },
  };
  const c = (status && config[status]) || config.ACTIVE;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600" /> +{delay} min delay
    </span>
  );
}

// ============ VEHICLE STATUS ============
export function VehicleStatusBadge({ status }: { status?: VehicleStatusType }) {
  const config: Record<VehicleStatusType, { color: string; bg: string; border: string; text: string }> = {
    active: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'In Service' },
    delayed: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Delayed' },
    'out-of-service': { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'Out of Service' },
  };
  const c = (status && config[status]) || config.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
      isSafe ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
    }`}>
      <Shield className="w-3.5 h-3.5" />
      <span>{status}</span>
    </span>
  );
}

// ============ LAST UPDATED ============
export function LastUpdated({ timestamp }: { timestamp: string }) {
  return (
    <span className="text-xs text-neutral-500 font-medium">
      {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

// ============ VEHICLE STATUS BADGE ============
export function VehicleStatusBadge({ status }: { status: string }) {
  const isOk = status === 'active' || status === 'on-time';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
      isOk ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-emerald-600' : 'bg-amber-600'}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
