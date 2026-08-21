import React from 'react';
import { Users, Clock, Accessibility, ShieldCheck, Bus, AlertTriangle, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import type { CrowdingLevel, AccessibilityStatus, SafetyStatus, VehicleStatusType } from '../../types';

// ============ CROWDING INDICATOR ============
export function CrowdingIndicator({ level, showLabel = true }: { level: CrowdingLevel; showLabel?: boolean }) {
  const config: Record<CrowdingLevel, { color: string; bg: string; icon: React.ReactNode; text: string; desc: string }> = {
    LOW: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <Users className="w-4 h-4" />, text: 'Low', desc: 'Plenty of space available' },
    MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50', icon: <Users className="w-4 h-4" />, text: 'Medium', desc: 'Moderately crowded' },
    HIGH: { color: 'text-red-700', bg: 'bg-red-50', icon: <Users className="w-4 h-4" />, text: 'High', desc: 'Very crowded' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`} title={c.desc} role="status">
      {c.icon}
      {showLabel && <span>{c.text} crowding</span>}
    </span>
  );
}

// ============ DELAY BADGE ============
export function DelayBadge({ delay }: { delay: number }) {
  if (delay <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50" role="status">
        <Clock className="w-3.5 h-3.5" />
        On time
      </span>
    );
  }
  const severity = delay >= 15 ? 'text-red-700 bg-red-50' : delay >= 8 ? 'text-amber-700 bg-amber-50' : 'text-yellow-700 bg-yellow-50';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${severity}`} role="status">
      <Clock className="w-3.5 h-3.5" />
      +{delay} min
    </span>
  );
}

// ============ VEHICLE ACCESSIBILITY BADGE ============
export function VehicleAccessibilityBadge({ status }: { status: AccessibilityStatus | boolean }) {
  const s = typeof status === 'boolean' ? (status ? 'AVAILABLE' : 'UNAVAILABLE') : status;
  const config: Record<AccessibilityStatus, { color: string; bg: string; icon: React.ReactNode; text: string }> = {
    AVAILABLE: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <Accessibility className="w-3.5 h-3.5" />, text: 'Accessible' },
    LIMITED: { color: 'text-amber-700', bg: 'bg-amber-50', icon: <MinusCircle className="w-3.5 h-3.5" />, text: 'Limited' },
    UNAVAILABLE: { color: 'text-red-700', bg: 'bg-red-50', icon: <XCircle className="w-3.5 h-3.5" />, text: 'Unavailable' },
  };
  const c = config[s];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`} role="status">
      {c.icon}{c.text}
    </span>
  );
}

// ============ SAFETY STATUS ============
export function SafetyStatusBadge({ status }: { status: SafetyStatus }) {
  const config: Record<SafetyStatus, { color: string; bg: string; icon: React.ReactNode; text: string }> = {
    NOT_STARTED: { color: 'text-gray-600', bg: 'bg-gray-100', icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Not started' },
    ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Active' },
    CHECK_IN_DUE: { color: 'text-amber-700', bg: 'bg-amber-50', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Check-in due' },
    OVERDUE: { color: 'text-red-700', bg: 'bg-red-50', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Overdue' },
    SAFE: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Safe' },
    EMERGENCY: { color: 'text-white', bg: 'bg-red-600', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Emergency' },
    COMPLETED: { color: 'text-navy-600', bg: 'bg-navy-50', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Completed' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`} role="status">
      {c.icon}{c.text}
    </span>
  );
}

// ============ VEHICLE STATUS ============
export function VehicleStatusBadge({ status }: { status: VehicleStatusType }) {
  const config: Record<VehicleStatusType, { color: string; bg: string; text: string }> = {
    active: { color: 'text-emerald-700', bg: 'bg-emerald-50', text: 'Active' },
    delayed: { color: 'text-amber-700', bg: 'bg-amber-50', text: 'Delayed' },
    'out-of-service': { color: 'text-red-700', bg: 'bg-red-50', text: 'Out of service' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`} role="status">
      <Bus className="w-3.5 h-3.5" />{c.text}
    </span>
  );
}

// ============ ACCESSIBILITY SCORE ============
export function AccessibilityScoreCard({ score, factors }: { score: number; factors?: string[] }) {
  const rating = score >= 80 ? 'Highly Accessible' : score >= 50 ? 'Moderately Accessible' : 'Limited Accessibility';
  const color = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-sm text-navy-500">{rating}</span>
      </div>
      {factors && factors.length > 0 && (
        <ul className="space-y-1" aria-label="Accessibility factors">
          {factors.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-navy-600">
              <CheckCircle className="w-4 h-4 text-access-green flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============ PROFILE BADGES ============
export function ProfileBadges({ profile }: { profile: import('../../types').AccessibilityProfile }) {
  const badges: { label: string; show: boolean }[] = [
    { label: 'Wheelchair', show: profile.mobility === 'wheelchair' },
    { label: 'Walking difficulty', show: profile.mobility === 'walking-difficulty' },
    { label: 'Elderly', show: profile.mobility === 'elderly' },
    { label: 'Avoid stairs', show: profile.stairs === 'avoid' },
    { label: `${profile.walkingTolerance} walking`, show: profile.walkingTolerance !== 'high' },
    { label: 'Avoid crowds', show: profile.crowding === 'avoid' },
    { label: 'Low vision', show: profile.vision === 'low-vision' },
    { label: 'Hearing assist', show: profile.hearing === 'hearing-assistance' },
    { label: 'Late-night', show: profile.safetyPreferences.includes('late-night') },
    { label: 'Safety-sensitive', show: profile.safetyPreferences.includes('safety-sensitive') },
  ];
  const active = badges.filter(b => b.show);
  if (active.length === 0) return <span className="text-sm text-navy-500">No specific accessibility needs configured</span>;
  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Accessibility profile">
      {active.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-navy-100 text-navy-700" role="listitem">
          <Accessibility className="w-3 h-3" />
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
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return new Date(ts).toLocaleDateString();
  };
  return (
    <span className="text-xs text-navy-400">
      Updated {getTimeAgo(timestamp)}
    </span>
  );
}
