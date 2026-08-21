import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Card, Button, Input, Select, Toggle } from '../../components/ui';
import type { AccessibilityProfile, EmergencyContact, SafetyPreference } from '../../types';
import { Save, User, Phone, Shield } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { state, updateProfile } = useAppStore();
  const { addToast } = useToast();
  
  const [profile, setProfile] = useState<AccessibilityProfile | null>(null);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({ name: '', phone: '', relationship: '' });

  useEffect(() => {
    if (state.accessibilityProfile) setProfile(state.accessibilityProfile);
    if (state.currentUser?.emergencyContact) setEmergencyContact(state.currentUser.emergencyContact);
  }, [state.accessibilityProfile, state.currentUser]);

  const handleSave = () => {
    if (profile) {
      updateProfile(profile);
      addToast('success', 'Profile saved successfully!');
    }
  };

  const toggleSafety = (pref: SafetyPreference) => {
    if (!profile) return;
    const current = profile.safetyPreferences || [];
    const updated = current.includes(pref) ? current.filter(p => p !== pref) : [...current, pref];
    setProfile({ ...profile, safetyPreferences: updated });
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accessibility Profile</h1>
        <p className="text-gray-500">Customize your routing preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <User className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Mobility & Navigation</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobility Device</label>
              <Select value={profile.mobility} onChange={(e) => setProfile({...profile, mobility: e.target.value as any})}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'walking-difficulty', label: 'Walking Difficulty' },
                  { value: 'elderly', label: 'Elderly / Slow Pace' },
                  { value: 'wheelchair', label: 'Wheelchair' }
                ]} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stair Preference</label>
              <Select value={profile.stairs} onChange={(e) => setProfile({...profile, stairs: e.target.value as any})}
                options={[
                  { value: 'acceptable', label: 'Can use stairs' },
                  { value: 'avoid', label: 'Avoid stairs completely' }
                ]} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Walking Tolerance</label>
              <Select value={profile.walkingTolerance} onChange={(e) => setProfile({...profile, walkingTolerance: e.target.value as any})}
                options={[
                  { value: 'minimal', label: 'Minimal (< 5 mins)' },
                  { value: 'low', label: 'Low (< 10 mins)' },
                  { value: 'moderate', label: 'Moderate (< 20 mins)' },
                  { value: 'high', label: 'High (No preference)' }
                ]} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crowding Preference</label>
              <Select value={profile.crowding} onChange={(e) => setProfile({...profile, crowding: e.target.value as any})}
                options={[
                  { value: 'acceptable', label: 'Acceptable' },
                  { value: 'low-preference', label: 'Prefer less crowded' },
                  { value: 'avoid', label: 'Avoid crowded vehicles' }
                ]} />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <Shield className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Safety & Sensory</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vision</label>
                <Select value={profile.vision} onChange={(e) => setProfile({...profile, vision: e.target.value as any})}
                  options={[{ value: 'normal', label: 'Normal' }, { value: 'low-vision', label: 'Low Vision / Blind' }]} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hearing</label>
                <Select value={profile.hearing} onChange={(e) => setProfile({...profile, hearing: e.target.value as any})}
                  options={[{ value: 'normal', label: 'Normal' }, { value: 'hearing-assistance', label: 'Require Hearing Assistance' }]} />
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Safety Preferences</label>
                <div className="space-y-2">
                  {(['late-night', 'prefer-safer', 'safety-sensitive'] as SafetyPreference[]).map(pref => (
                    <Toggle 
                      key={pref} 
                      label={pref.replace('-', ' ')} 
                      checked={profile.safetyPreferences?.includes(pref) || false}
                      onChange={() => toggleSafety(pref)} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2 border-b pb-2">
              <Phone className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Emergency Contact</h2>
            </div>
            <Input label="Name" value={emergencyContact.name} onChange={e => setEmergencyContact({...emergencyContact, name: e.target.value})} />
            <Input label="Phone" value={emergencyContact.phone} onChange={e => setEmergencyContact({...emergencyContact, phone: e.target.value})} />
            <Input label="Relationship" value={emergencyContact.relationship} onChange={e => setEmergencyContact({...emergencyContact, relationship: e.target.value})} />
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg"><Save className="w-4 h-4 mr-2" /> Save Preferences</Button>
      </div>
    </div>
  );
};

export default ProfilePage;
