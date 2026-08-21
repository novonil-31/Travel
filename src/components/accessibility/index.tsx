import React from 'react';
import { Users, Clock, Accessibility, ShieldCheck, Bus, AlertTriangle, CheckCircle, XCircle, MinusCircle, HeartPulse } from 'lucide-react';
import type { CrowdingLevel, AccessibilityStatus, SafetyStatus, VehicleStatusType } from '../../types';

// ============ CROWDING INDICATOR ============
export function CrowdingIndicator({ level, showLabel = true }: { level: CrowdingLevel; showLabel?: boolean }) {
  const config: Record<CrowdingLevel, { color: string; bg: string; border: string; text: string }> = {
    LOW: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Low Crowding' },
    MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Moderate' },
    HIGH: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', text: 'Crowded' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${c.color} ${c.bg} ${c.border}`} role="status">
      <Users className="w-3.5 h-3.5" />
      {showLabel && <span>{c.text}</span>}
    </span>
  );
}

// ============ DELAY BADGE ============
export function DelayBadge({ delay }: { delay: number }) {
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${isHigh ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`} role="status">
      <Clock className="w-3.5 h-3.5" />
      +{delay} min delay
    </span>
  );
}

// ============ VEHICLE ACCESSIBILITY BADGE ============
export function VehicleAccessibilityBadge({ status }: { status: AccessibilityStatus | boolean }) {
  const s = typeof status === 'boolean' ? (status ? 'AVAILABLE' : 'UNAVAILABLE') : status;
  const config: Record<AccessibilityStatus, { color: string; bg: string; border: string; text: string }> = {
    AVAILABLE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Wheelchair Ramp' },
    LIMITED: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Assistance Needed' },
    UNAVAILABLE: { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'Standard Access' },
  };
  const c = config[s];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${c.color} ${c.bg} ${c.border}`} role="status">
      <Accessibility className="w-3.5 h-3.5" />
      {c.text}
    </span>
  );
}

// ============ SAFETY STATUS ============
export function SafetyStatusBadge({ status }: { status: SafetyStatus }) {
  const config: Record<SafetyStatus, { color: string; bg: string; border: string; icon: React.ReactNode; text: string }> = {
    NOT_STARTED: { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Safety Inactive' },
    ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <HeartPulse className="w-3.5 h-3.5" />, text: 'Watchdog Active' },
    CHECK_IN_DUE: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Check-in Due' },
    OVERDUE: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Overdue Alert' },
    SAFE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Verified Safe' },
    EMERGENCY: { color: 'text-white', bg: 'bg-red-600', border: 'border-red-600', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'EMERGENCY' },
    COMPLETED: { color: 'text-neutral-700', bg: 'bg-neutral-100', border: 'border-neutral-200', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Concluded' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${c.color} ${c.bg} ${c.border}`} role="status">
      {c.icon}{c.text}
    </span>
  );
}

// ============ VEHICLE STATUS ============
export function VehicleStatusBadge({ status }: { status: VehicleStatusType }) {
  const config: Record<VehicleStatusType, { color: string; bg: string; border: string; text: string }> = {
    active: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'In Service' },
    delayed: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Delayed' },
    'out-of-service': { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'Out of Service' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.color} ${c.bg} ${c.border}`} role="status">
      <Bus className="w-3.5 h-3.5" />{c.text}
    </span>
  );
}

// ============ PROFILE BADGES ============
export function ProfileBadges({ profile }: { profile: import('../../types').AccessibilityProfile }) {
  const badges: { label: string; show: boolean }[] = [
    { label: 'Wheelchair Ramp', show: profile.mobility === 'wheelchair' },
    { label: 'Walking Support', show: profile.mobility === 'walking-difficulty' },
    { label: 'Senior Assistance', show: profile.mobility === 'elderly' },
    { label: 'Zero Stairs', show: profile.stairs === 'avoid' },
    { label: `${profile.walkingTolerance} Walking`, show: profile.walkingTolerance !== 'high' },
    { label: 'Low Crowding', show: profile.crowding === 'avoid' },
    { label: 'Night Watchdog', show: profile.safetyPreferences.includes('late-night') },
  ];
  const active = badges.filter(b => b.show);
  if (active.length === 0) return <span className="text-xs text-neutral-500 font-medium">Standard Transit Profile</span>;
  return (
    <div className="flex flex-wrap gap-1.5" role="list">
      {active.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200" role="listitem">
          <Accessibility className="w-3 h-3 text-neutral-600" />
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ============ LAST UPDATED ============
export function LastUpdated({ timestamp }: { timestamp: string }) {
  const getTimeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
      {getTimeAgo(timestamp)}
    </span>
  );
}
