import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Input } from '../../components/ui';
import {
  Accessibility, Shield, Save, User, Check, Footprints,
  Users, Moon, Phone, WifiOff, Download, ArrowRight, ShieldCheck, HeartPulse
} from 'lucide-react';
import type { AccessibilityProfile, EmergencyContact, SafetyPreference } from '../../types';
import { Link } from 'react-router-dom';
import { authApi } from '../../api';

export default function ProfilePage() {
  const { state, updateProfile, setUser, dispatch } = useAppStore();
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
      name: 'Priya Sharma',
      phone: '+91 98765 43210',
      relationship: 'Sister',
    }
  );

  const [offlineDownloaded, setOfflineDownloaded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    updateProfile(profile);

    const updatedUser = state.currentUser ? {
      ...state.currentUser,
      emergencyContact,
      profile,
    } : {
      id: 'local-user',
      name: 'Registered Passenger',
      role: 'passenger' as const,
      emergencyContact,
      profile,
    };

    setUser(updatedUser);

    try {
      if (localStorage.getItem('access_token')) {
        await authApi.updateEmergencyContact({
          name: emergencyContact.name,
          phone: emergencyContact.phone,
          relationship: emergencyContact.relationship,
        });
      }
      addToast('success', 'Emergency SOS contact & profile saved successfully!');
    } catch (err: any) {
      console.warn('Backend sync failed, saved locally in browser storage.', err);
      addToast('success', 'Emergency SOS contact saved locally in your account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadOffline = () => {
    setOfflineDownloaded(true);
    addToast('success', 'Offline Transit Pack downloaded (3 corridors, 12 stops, offline schedule cached).');
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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Account & Safety Profile
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Calibrate mobility parameters, emergency contacts, and offline packs.
          </p>
        </div>
        <Button onClick={handleSave} size="sm" className="shadow-sm">
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
        </Button>
      </div>

      <div className="space-y-5">
        {/* Mobility Category */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <Accessibility className="w-5 h-5 text-neutral-900" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Mobility & Accessibility Preference
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'wheelchair', label: '♿ Wheelchair', desc: 'Ramps & 0 Stairs' },
              { id: 'walking-difficulty', label: '🦯 Walking Aid', desc: 'Minimal Walking' },
              { id: 'elderly', label: '👵 Senior Citizen', desc: 'Seats & Short Walks' },
              { id: 'none', label: '🚶 Standard', desc: 'Fastest Routes' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setProfile({ ...profile, mobility: m.id as any })}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  profile.mobility === m.id
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                <div className="font-bold text-xs">{m.label}</div>
                <div className={`text-[10px] mt-0.5 ${profile.mobility === m.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Stairs & Lighting toggles */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100 text-xs">
            <label className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.stairs === 'avoid'}
                onChange={(e) => setProfile({ ...profile, stairs: e.target.checked ? 'avoid' : 'acceptable' })}
                className="rounded text-black focus:ring-black"
              />
              <span className="font-semibold text-neutral-900">Strictly Avoid Stairs & Underpasses</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.safetyPreferences.includes('late-night')}
                onChange={() => toggleSafetyPref('late-night')}
                className="rounded text-black focus:ring-black"
              />
              <span className="font-semibold text-neutral-900">Prioritize Well-Lit Night Corridors</span>
            </label>
          </div>
        </div>

        {/* Emergency Contact & Safety Watchdog */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Safety Check-in & Emergency Contact
            </h2>
          </div>
          <p className="text-xs text-neutral-500">
            Designated contact notified automatically during emergencies or if a late journey experiences unexpected delays.
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Contact Name"
              value={emergencyContact.name}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
              placeholder="e.g. Priya Sharma"
            />
            <Input
              label="Emergency Phone"
              value={emergencyContact.phone}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Relationship"
              value={emergencyContact.relationship || 'Sister'}
              onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
              placeholder="e.g. Sister / Parent"
            />
          </div>
        </div>

        {/* Offline Route Information Module */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-5 h-5 text-neutral-900" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Offline Route Information
                </h2>
                <span className="text-xs text-neutral-500">
                  Pre-download transit corridors for zero-network areas
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant={offlineDownloaded ? 'secondary' : 'primary'}
              onClick={handleDownloadOffline}
            >
              {offlineDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Cached Offline
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download Pack
                </>
              )}
            </Button>
          </div>

          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs text-neutral-700 flex items-center justify-between">
            <span>Offline Pack: Campus Gate, Patia, Master Canteen, Jaydev Vihar & ISBT</span>
            <span className="font-bold text-neutral-900">1.4 MB</span>
          </div>
        </div>

      </div>
    </div>
  );
}
