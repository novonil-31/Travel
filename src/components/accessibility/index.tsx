import React from 'react';
import { Users, Clock, Accessibility, ShieldCheck, Bus, AlertTriangle, CheckCircle, XCircle, MinusCircle, HeartPulse } from 'lucide-react';
import type { CrowdingLevel, AccessibilityStatus, SafetyStatus, VehicleStatusType } from '../../types';

// ============ CROWDING INDICATOR ============
export function CrowdingIndicator({ level, showLabel = true }: { level: CrowdingLevel; showLabel?: boolean }) {
  const config: Record<CrowdingLevel, { color: string; bg: string; border: string; icon: React.ReactNode; text: string; desc: string }> = {
    LOW: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30 shadow-sm shadow-emerald-500/10', icon: <Users className="w-3.5 h-3.5" />, text: 'Low', desc: 'Plenty of space available' },
    MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30 shadow-sm shadow-amber-500/10', icon: <Users className="w-3.5 h-3.5" />, text: 'Medium', desc: 'Moderately crowded' },
    HIGH: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30 shadow-sm shadow-rose-500/10', icon: <Users className="w-3.5 h-3.5" />, text: 'High', desc: 'Very crowded' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${c.color} ${c.bg} ${c.border}`} title={c.desc} role="status">
      {c.icon}
      {showLabel && <span>{c.text} Crowding</span>}
    </span>
  );
}

// ============ DELAY BADGE ============
export function DelayBadge({ delay }: { delay: number }) {
  if (delay <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 backdrop-blur-md" role="status">
        <Clock className="w-3.5 h-3.5" />
        On Time
      </span>
    );
  }
  const severity = delay >= 15 ? 'text-rose-400 bg-rose-500/10 border-rose-500/40 shadow-glow-red' : delay >= 8 ? 'text-amber-400 bg-amber-500/10 border-amber-500/40 shadow-glow-amber' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${severity}`} role="status">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      +{delay} min delay
    </span>
  );
}

// ============ VEHICLE ACCESSIBILITY BADGE ============
export function VehicleAccessibilityBadge({ status }: { status: AccessibilityStatus | boolean }) {
  const s = typeof status === 'boolean' ? (status ? 'AVAILABLE' : 'UNAVAILABLE') : status;
  const config: Record<AccessibilityStatus, { color: string; bg: string; border: string; icon: React.ReactNode; text: string }> = {
    AVAILABLE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30 shadow-sm shadow-emerald-500/10', icon: <Accessibility className="w-3.5 h-3.5" />, text: 'Ramp & Access' },
    LIMITED: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <MinusCircle className="w-3.5 h-3.5" />, text: 'Limited Access' },
    UNAVAILABLE: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: <XCircle className="w-3.5 h-3.5" />, text: 'Inaccessible' },
  };
  const c = config[s];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${c.color} ${c.bg} ${c.border}`} role="status">
      {c.icon}{c.text}
    </span>
  );
}

// ============ SAFETY STATUS ============
export function SafetyStatusBadge({ status }: { status: SafetyStatus }) {
  const config: Record<SafetyStatus, { color: string; bg: string; border: string; icon: React.ReactNode; text: string }> = {
    NOT_STARTED: { color: 'text-slate-400', bg: 'bg-slate-800/60', border: 'border-white/10', icon: <ShieldCheck className="w-3.5 h-3.5" />, text: 'Not Active' },
    ACTIVE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40 shadow-glow-green', icon: <HeartPulse className="w-3.5 h-3.5 animate-heartbeat" />, text: 'Safety Active' },
    CHECK_IN_DUE: { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40 shadow-glow-amber', icon: <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />, text: 'Check-in Due' },
    OVERDUE: { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/50 shadow-glow-red animate-pulse', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'Overdue Alert' },
    SAFE: { color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40 shadow-glow-green', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Verified Safe' },
    EMERGENCY: { color: 'text-white', bg: 'bg-gradient-to-r from-red-600 to-rose-700', border: 'border-red-400 shadow-glow-red animate-pulse', icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'EMERGENCY' },
    COMPLETED: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Session Closed' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${c.color} ${c.bg} ${c.border}`} role="status">
      {c.icon}{c.text}
    </span>
  );
}

// ============ VEHICLE STATUS ============
export function VehicleStatusBadge({ status }: { status: VehicleStatusType }) {
  const config: Record<VehicleStatusType, { color: string; bg: string; border: string; text: string }> = {
    active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'In Service' },
    delayed: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'Delayed' },
    'out-of-service': { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'Out of Service' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${c.color} ${c.bg} ${c.border}`} role="status">
      <Bus className="w-3.5 h-3.5" />{c.text}
    </span>
  );
}

// ============ ACCESSIBILITY SCORE ============
export function AccessibilityScoreCard({ score, factors }: { score: number; factors?: string[] }) {
  const rating = score >= 80 ? 'Highly Accessible' : score >= 50 ? 'Moderately Accessible' : 'Limited Accessibility';
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="space-y-3 bg-dark-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accessibility Match</span>
        <span className={`text-2xl font-black ${color} tracking-tight`}>{score}<span className="text-xs text-slate-500 font-normal">/100</span></span>
      </div>
      <div className="text-xs font-semibold text-slate-300">{rating}</div>
      {factors && factors.length > 0 && (
        <ul className="space-y-1.5 pt-1" aria-label="Accessibility factors">
          {factors.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
    { label: 'Wheelchair Mode', show: profile.mobility === 'wheelchair' },
    { label: 'Walking Support', show: profile.mobility === 'walking-difficulty' },
    { label: 'Senior Assistance', show: profile.mobility === 'elderly' },
    { label: 'Zero Stairs', show: profile.stairs === 'avoid' },
    { label: `${profile.walkingTolerance} Walking`, show: profile.walkingTolerance !== 'high' },
    { label: 'Low Crowds', show: profile.crowding === 'avoid' },
    { label: 'High Contrast', show: profile.vision === 'low-vision' },
    { label: 'Audio Alerts', show: profile.hearing === 'hearing-assistance' },
    { label: 'Night Safety', show: profile.safetyPreferences.includes('late-night') },
    { label: 'Safety Sensitive', show: profile.safetyPreferences.includes('safety-sensitive') },
  ];
  const active = badges.filter(b => b.show);
  if (active.length === 0) return <span className="text-xs text-slate-400">Standard Transit Profile</span>;
  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Accessibility profile">
      {active.map((b, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-emerald-300 shadow-sm backdrop-blur-md" role="listitem">
          <Accessibility className="w-3.5 h-3.5 text-emerald-400" />
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
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {getTimeAgo(timestamp)}
    </span>
  );
}
