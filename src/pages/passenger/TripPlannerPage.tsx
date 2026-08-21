import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Toggle } from '../../components/ui';
import { DEMO_STOPS, generateDemoSearchResults } from '../../data/mock';
import { Navigation, MapPin, ArrowDownUp, Sparkles, CheckCircle, Shield, Accessibility, Search } from 'lucide-react';
import { ProfileBadges } from '../../components/accessibility';

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const { setSearchResults, state } = useAppStore();
  
  const [origin, setOrigin] = useState<string>('Campus Gate');
  const [destination, setDestination] = useState<string>('Patia');
  const [useProfile, setUseProfile] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = () => {
    if (!origin || !destination) return;
    setIsSearching(true);
    setTimeout(() => {
      const results = generateDemoSearchResults(origin, destination);
      setSearchResults(results);
      setIsSearching(false);
      navigate('/routes');
    }, 600); // brief pleasant scanning sensation
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-glow-green">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Accessible Trip Planner</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Where are we taking you?
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Every route evaluated across physical step count, vehicle ramps, lift availability, and crowding.
        </p>
      </div>

      {/* Main Search Card */}
      <div className="bg-dark-900/90 backdrop-blur-2xl border border-white/15 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
        <div className="space-y-4 relative">
          {/* Origin Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Start Location / Stop</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400">
                <MapPin className="w-5 h-5" />
              </div>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-dark-950/80 border border-white/15 text-white font-semibold focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all text-sm sm:text-base appearance-none cursor-pointer"
              >
                {DEMO_STOPS.map(stop => (
                  <option key={stop.id} value={stop.name} className="bg-dark-900 text-white">
                    {stop.name} {stop.accessible ? '♿' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={handleSwap}
              className="p-2.5 rounded-2xl bg-dark-800 border border-white/20 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 hover:scale-110 active:scale-95 transition-all shadow-lg"
              aria-label="Swap starting point and destination"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Destination</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400">
                <Navigation className="w-5 h-5" />
              </div>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-dark-950/80 border border-white/15 text-white font-semibold focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-none transition-all text-sm sm:text-base appearance-none cursor-pointer"
              >
                {DEMO_STOPS.map(stop => (
                  <option key={stop.id} value={stop.name} className="bg-dark-900 text-white">
                    {stop.name} {stop.accessible ? '♿' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Campus Chips */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quick Presets:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { from: 'Campus Gate', to: 'Patia' },
              { from: 'Hospital', to: 'Jaydev Vihar' },
              { from: 'Infocity', to: 'Campus 25' },
              { from: 'KIIT Square', to: 'Railway Station' },
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => { setOrigin(p.from); setDestination(p.to); }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
              >
                {p.from} → {p.to}
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility Profile Toggle */}
        <div className="p-4 sm:p-5 rounded-2xl bg-dark-950/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Accessibility className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-sm font-bold text-white block">Use My Accessibility Profile</span>
                <span className="text-xs text-slate-400">Score and filter routes according to your mobility needs</span>
              </div>
            </div>
            <Toggle
              label=""
              checked={useProfile}
              onChange={setUseProfile}
            />
          </div>

          {useProfile && state.accessibilityProfile && (
            <div className="pt-3 border-t border-white/10">
              <ProfileBadges profile={state.accessibilityProfile} />
            </div>
          )}
        </div>

        {/* CTA Search Button */}
        <Button
          size="lg"
          className="w-full text-base py-4 shadow-glow-green"
          onClick={handleSearch}
          loading={isSearching}
        >
          <Search className="w-5 h-5 mr-2" /> Find Best Accessible Routes
        </Button>
      </div>
    </div>
  );
}
