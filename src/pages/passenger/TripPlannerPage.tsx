import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Toggle } from '../../components/ui';
import { DEMO_STOPS, generateDemoSearchResults } from '../../data/mock';
import { journeysApi } from '../../api';
import { Navigation, MapPin, ArrowDownUp, Accessibility, Search, Clock, Shield } from 'lucide-react';
import { ProfileBadges } from '../../components/accessibility';
import type { RouteSearchResult } from '../../types';

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const { setSearchResults, state, updateProfile } = useAppStore();
  
  const [origin, setOrigin] = useState<string>('Campus Gate');
  const [destination, setDestination] = useState<string>('Patia');
  const [useProfile, setUseProfile] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setIsSearching(true);

    try {
      // Find stop coords if available
      const originStop = DEMO_STOPS.find(s => s.name.toLowerCase().includes(origin.toLowerCase())) || DEMO_STOPS[0];
      const destStop = DEMO_STOPS.find(s => s.name.toLowerCase().includes(destination.toLowerCase())) || DEMO_STOPS[DEMO_STOPS.length - 1];

      // Try backend journey planner
      const backendRes = await journeysApi.plan({
        origin: { lat: originStop.lat, lng: originStop.lng, name: origin },
        destination: { lat: destStop.lat, lng: destStop.lng, name: destination },
        profileType: state.accessibilityProfile.mobility === 'wheelchair' ? 'WHEELCHAIR' : 'GENERAL',
      });

      if (backendRes && backendRes.options && backendRes.options.length > 0) {
        // Map backend options to frontend RouteSearchResult format
        const mapped: RouteSearchResult[] = backendRes.options.map((opt) => ({
          route: {
            id: opt.routeId,
            name: opt.routeLongName || `Route ${opt.routeShortName}`,
            shortName: opt.routeShortName,
            vehicleType: opt.vehicleType as any,
            stops: [],
            color: '#000000',
            description: `${opt.boardStop?.name || 'Origin'} to ${opt.alightStop?.name || 'Destination'}`,
            active: true,
          },
          eta: opt.durationMinutes,
          duration: opt.durationMinutes,
          walkingDistance: opt.walkingDistanceM,
          transfers: 0,
          stairs: opt.accessibility.wheelchairCompatible ? 0 : 2,
          crowding: (opt.crowding.level || 'LOW') as any,
          delay: 0,
          vehicleAccessible: opt.accessibility.wheelchairCompatible,
          scores: {
            accessibility: opt.scores?.accessibility || 85,
            safety: opt.scores?.safety || 90,
            reliability: opt.scores?.reliability || 88,
            comfort: opt.scores?.crowding || 80,
            overall: opt.scores?.overall || 88,
          },
          recommendation: {
            recommended: opt.rank === 1,
            rank: opt.rank || 1,
            reasons: opt.explanation || ['Optimized for step-free access'],
            tradeoff: opt.recommendation || '',
          },
          segments: [
            {
              type: 'walk',
              from: origin,
              to: opt.boardStop?.name || 'Boarding Station',
              duration: opt.walkingTimeMinutes || 3,
              accessible: true,
              stairs: 0,
            },
            {
              type: 'ride',
              from: opt.boardStop?.name || 'Boarding Station',
              to: opt.alightStop?.name || 'Alighting Station',
              duration: opt.durationMinutes - (opt.walkingTimeMinutes || 3),
              accessible: opt.accessibility.wheelchairCompatible,
              stairs: opt.accessibility.wheelchairCompatible ? 0 : 2,
            },
          ],
          condition: {
            routeId: opt.routeId,
            delay: 0,
            crowding: (opt.crowding.level || 'LOW') as any,
            accessibility: opt.accessibility.wheelchairCompatible ? 'AVAILABLE' : 'LIMITED',
            vehicleStatus: 'active',
            updatedAt: new Date().toISOString(),
          },
        }));
        setSearchResults(mapped);
        setIsSearching(false);
        navigate('/routes');
        return;
      }
    } catch {
      // Fallback to offline generator if backend not active
    }

    const fallbackResults = generateDemoSearchResults(origin, destination);
    setSearchResults(fallbackResults);
    setIsSearching(false);
    navigate('/routes');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
          Where can we take you?
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Every route evaluated for step-free access, ramps, lifts, and vehicle crowding.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 p-6 sm:p-8 rounded-3xl shadow-uber-elevated space-y-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Origin Picker */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Pickup Location</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black pointer-events-none" />
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
              >
                {DEMO_STOPS.map(stop => (
                  <option key={stop.id} value={stop.name}>
                    {stop.name} {stop.accessible ? '♿ Accessible' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 transition-all"
              aria-label="Swap"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Picker */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">Destination</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 bg-black pointer-events-none" />
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
              >
                {DEMO_STOPS.map(stop => (
                  <option key={stop.id} value={stop.name}>
                    {stop.name} {stop.accessible ? '♿ Accessible' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 space-y-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Popular Destinations:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { from: 'Campus Gate', to: 'Patia' },
                { from: 'Hospital', to: 'Jaydev Vihar' },
                { from: 'Infocity', to: 'Campus 25' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setOrigin(p.from); setDestination(p.to); }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800 transition-colors"
                >
                  {p.from} → {p.to}
                </button>
              ))}
            </div>
          </div>

          {/* Mobility Profile Switch */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Accessibility className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-neutral-900">Filter by My Accessibility Profile</span>
              </div>
              <Toggle label="" checked={useProfile} onChange={setUseProfile} />
            </div>

            {useProfile && state.accessibilityProfile && (
              <div className="pt-2 border-t border-neutral-200">
                <ProfileBadges profile={state.accessibilityProfile} />
              </div>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full text-base py-4" loading={isSearching}>
            <Search className="w-4 h-4 mr-2" /> Find Step-Free Routes
          </Button>
        </form>
      </div>
    </div>
  );
}
