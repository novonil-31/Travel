import React from 'react';
import { Shield, Clock, Users, Accessibility, CheckCircle, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import type { AccessibilityProfile, CrowdingLevel, AccessibilityStatus } from '../../types';

// ============ PROFILE BADGES ============
export function ProfileBadges({ profile }: { profile: AccessibilityProfile }) {
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

// ============ CROWDING INDICATOR ============
export function CrowdingIndicator({ level }: { level: CrowdingLevel }) {
  const configs: Record<CrowdingLevel, { label: string; bg: string; dot: string }> = {
    LOW: { label: 'Low Crowding', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' },
    MEDIUM: { label: 'Moderate', bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-600' },
    HIGH: { label: 'Congested', bg: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-600' },
  };
  const cfg = configs[level] || configs.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </span>
  );
}

// ============ VEHICLE ACCESSIBILITY BADGE ============
export function VehicleAccessibilityBadge({ status }: { status: AccessibilityStatus | boolean }) {
  const isOk = status === 'AVAILABLE' || status === true;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
      isOk ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'
    }`}>
      ♿ {isOk ? 'Electric Ramp' : 'Standard'}
    </span>
  );
}

// ============ DELAY BADGE ============
export function DelayBadge({ delay }: { delay: number }) {
  if (delay === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Clock className="w-3.5 h-3.5 text-emerald-600" /> On Time
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600" /> +{delay} min delay
    </span>
  );
}

// ============ SAFETY STATUS BADGE ============
export function SafetyStatusBadge({ status }: { status: string }) {
  const isSafe = status === 'SAFE' || status === 'ACTIVE';
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
