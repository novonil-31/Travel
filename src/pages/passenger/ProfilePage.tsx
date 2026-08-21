import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Input } from '../../components/ui';
import { Accessibility, Shield, Save, User, Sparkles, Check, Footprints, Users, Eye, Volume2, Moon } from 'lucide-react';
import type { AccessibilityProfile, EmergencyContact, SafetyPreference } from '../../types';

export default function ProfilePage() {
  const { state, updateProfile } = useAppStore();
  const { addToast } = useToast();

  const [profile, setProfile] = useState<AccessibilityProfile>(
    state.accessibilityProfile || {
      mobility: 'wheelchair',
      stairs: 'avoid',
      walkingTolerance: 'low',
      crowding: 'avoid',
      vision: 'normal',
      hearing: 'normal',
      safetyPreferences: ['late-night', 'prefer-safer'],
    }
  );

  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(
    state.currentUser?.emergencyContact || {
      name: 'Priya',
      phone: '+91 98765 43210',
      relationship: 'Sister',
    }
  );

  const handleSave = () => {
    updateProfile(profile);
    addToast('success', 'Accessibility profile & safety preferences saved.');
  };

  const toggleSafetyPref = (pref: SafetyPreference) => {
    setProfile(prev => {
      const exists = prev.safetyPreferences.includes(pref);
      return {
        ...prev,
        safetyPreferences: exists
          ? prev.safetyPreferences.filter(p => p !== pref)
          : [...prev.safetyPreferences, pref],
      };
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-glow-green">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Personal Transit DNA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Accessibility Profile</h1>
          <p className="text-xs sm:text-sm text-slate-400">Routes are evaluated and customized against these parameters.</p>
        </div>
        <Button onClick={handleSave} size="lg" className="shadow-glow-green">
          <Save className="w-4 h-4 mr-2" /> Save Profile
        </Button>
      </div>

      <div className="space-y-6">
        {/* Mobility Category */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Accessibility className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Physical Mobility Needs</h2>
              <span className="text-xs text-slate-400">Filters vehicle ramps and station lift accessibility</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'wheelchair', label: 'Wheelchair', desc: 'Ramps & flat terrain only' },
              { id: 'walking-difficulty', label: 'Walking Support', desc: 'Stairs limited' },
              { id: 'elderly', label: 'Senior Support', desc: 'Seats & short walks' },
              { id: 'none', label: 'Standard', desc: 'No restrictions' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setProfile({ ...profile, mobility: m.id as any })}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  profile.mobility === m.id
                    ? 'bg-emerald-500/15 border-emerald-400/80 shadow-glow-green ring-1 ring-emerald-400 text-white'
                    : 'bg-dark-950/60 border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{m.label}</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">{m.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Stairs & Walking Tolerance */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <Footprints className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stair Tolerance</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'avoid', label: 'Avoid All Stairs', desc: 'Ramps/Elevators' },
                { id: 'acceptable', label: 'Stairs OK', desc: 'Normal steps' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setProfile({ ...profile, stairs: s.id as any })}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    profile.stairs === s.id
                      ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400 text-white shadow-glow-cyan'
                      : 'bg-dark-950/60 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs block">{s.label}</span>
                  <span className="text-[10px] text-slate-400">{s.desc}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crowd Sensitivity</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'avoid', label: 'Avoid Crowds', desc: 'Low density routes' },
                { id: 'acceptable', label: 'Any Density', desc: 'Fastest transit' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setProfile({ ...profile, crowding: c.id as any })}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    profile.crowding === c.id
                      ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400 text-white shadow-glow-amber'
                      : 'bg-dark-950/60 border-white/10 text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs block">{c.label}</span>
                  <span className="text-[10px] text-slate-400">{c.desc}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Safety Preferences & Emergency Contact */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Emergency Contact & Safety Protocols</h2>
              <span className="text-xs text-slate-400">Contact notified automatically if safety heartbeat is overdue</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Contact Full Name"
              value={emergencyContact.name}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={emergencyContact.phone}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
            />
            <Input
              label="Relationship"
              value={emergencyContact.relationship}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Safety Features:</span>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'late-night', label: '🌙 Late-Night Security Corridors' },
                { id: 'prefer-safer', label: '🛡️ CCTV Monitored Routes' },
                { id: 'safety-sensitive', label: '⚡ Fast SOS Escalation' },
              ].map(sp => {
                const active = profile.safetyPreferences.includes(sp.id as SafetyPreference);
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => toggleSafetyPref(sp.id as SafetyPreference)}
                    className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${
                      active
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-glow-red'
                        : 'bg-dark-950/60 text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {sp.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
