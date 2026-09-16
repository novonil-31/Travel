import React, { useState } from 'react';
import { Home, Briefcase, Lock, Plus, Check, X } from 'lucide-react';
import { useAppStore } from '../store';
import { isGuestAccount, getOrCreateCommuterPass } from '../utils/authUtils';

interface SavedPlacesBarProps {
  onSelectPlace?: (place: { name: string; address: string; lat: number; lng: number }) => void;
  className?: string;
}

export const SavedPlacesBar: React.FC<SavedPlacesBarProps> = ({ onSelectPlace, className = '' }) => {
  const { state, setSavedPlace } = useAppStore();
  const [editingType, setEditingType] = useState<'home' | 'work' | null>(null);
  const [customAddress, setCustomAddress] = useState('');

  const isGuest = isGuestAccount(state.currentUser);
  const homePlace = state.currentUser?.savedPlaces?.home;
  const workPlace = state.currentUser?.savedPlaces?.work;
  const commuterPass = getOrCreateCommuterPass(state.currentUser);

  const handlePlaceClick = (type: 'home' | 'work') => {
    if (isGuest) {
      return;
    }

    const place = type === 'home' ? homePlace : workPlace;
    if (place && onSelectPlace) {
      onSelectPlace(place);
    } else {
      setEditingType(type);
      setCustomAddress('');
    }
  };

  const handleSavePlace = () => {
    if (!editingType || !customAddress.trim() || isGuest) return;
    
    // Save address with fallback coordinates
    const activeRegion = { lat: 28.6139, lng: 77.2090 };
    setSavedPlace(editingType, {
      name: editingType === 'home' ? 'Home' : 'Work',
      address: customAddress.trim(),
      lat: activeRegion.lat,
      lng: activeRegion.lng,
    });
    setEditingType(null);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Commuter Pass Balance (Members Only) */}
      {!isGuest && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="font-bold text-neutral-900">
                Transit Smart Pass: <span className="text-emerald-700 font-extrabold">Active</span>
              </span>
            </div>
            <span className="text-[11px] font-bold text-neutral-500">
              Pass ID: <span className="font-mono text-neutral-700">{commuterPass.passId}</span>
            </span>
          </div>
        </div>
      )}

      {/* Saved Places Fast Buttons */}
      <div className="flex items-center gap-2">
        {/* Home Button */}
        <button
          type="button"
          onClick={() => handlePlaceClick('home')}
          disabled={isGuest}
          title={isGuest ? 'Sign in to save Home location' : undefined}
          className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
            isGuest
              ? 'bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed'
              : homePlace
              ? 'bg-neutral-900 text-white border-black hover:bg-neutral-800'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Home className={`w-3.5 h-3.5 shrink-0 ${homePlace && !isGuest ? 'text-white' : 'text-neutral-500'}`} />
            <div className="text-left truncate">
              <span className="block truncate">
                {homePlace && !isGuest ? homePlace.address : 'Home'}
              </span>
            </div>
          </div>
          {isGuest ? (
            <Lock className="w-3 h-3 text-neutral-400 shrink-0 ml-1.5" />
          ) : !homePlace ? (
            <Plus className="w-3 h-3 text-neutral-400 shrink-0 ml-1.5" />
          ) : null}
        </button>

        {/* Work Button */}
        <button
          type="button"
          onClick={() => handlePlaceClick('work')}
          disabled={isGuest}
          title={isGuest ? 'Sign in to save Work location' : undefined}
          className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition-all ${
            isGuest
              ? 'bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed'
              : workPlace
              ? 'bg-neutral-900 text-white border-black hover:bg-neutral-800'
              : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Briefcase className={`w-3.5 h-3.5 shrink-0 ${workPlace && !isGuest ? 'text-white' : 'text-neutral-500'}`} />
            <div className="text-left truncate">
              <span className="block truncate">
                {workPlace && !isGuest ? workPlace.address : 'Work'}
              </span>
            </div>
          </div>
          {isGuest ? (
            <Lock className="w-3 h-3 text-neutral-400 shrink-0 ml-1.5" />
          ) : !workPlace ? (
            <Plus className="w-3 h-3 text-neutral-400 shrink-0 ml-1.5" />
          ) : null}
        </button>
      </div>

      {/* Inline Set Home/Work Dialog for Logged-In User */}
      {editingType && !isGuest && (
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-900">
              Save {editingType === 'home' ? 'Home' : 'Work'} Address
            </span>
            <button onClick={() => setEditingType(null)} className="text-neutral-400 hover:text-black">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder={`Enter ${editingType === 'home' ? 'Home' : 'Work'} address or landmark`}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
              autoFocus
            />
            <button
              onClick={handleSavePlace}
              disabled={!customAddress.trim()}
              className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
