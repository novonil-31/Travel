import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge } from '../../components/ui';
import { ProfileBadges, SafetyStatusBadge, DelayBadge, CrowdingIndicator, VehicleAccessibilityBadge, LastUpdated } from '../../components/accessibility';
import { MapPin, Navigation, ArrowRight, Clock, AlertTriangle, Bus, Sparkles, Shield, HeartPulse, ChevronRight } from 'lucide-react';
import { DEMO_CONDITIONS } from '../../data/mock';

export default function HomePage() {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { currentUser, accessibilityProfile, activeJourney, journeyHistory } = state;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Accessible Navigation Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {greeting}, {currentUser?.name || 'Aarav'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Routes are currently calibrated to your mobility preferences.
          </p>
        </div>

        <Link to="/plan" className="self-start sm:self-auto">
          <Button size="lg" className="w-full sm:w-auto shadow-glow-green">
            <Navigation className="w-4 h-4 mr-2" /> Plan Journey
          </Button>
        </Link>
      </div>

      {/* Active Profile Summary Chip Banner */}
      {accessibilityProfile && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 p-4 sm:p-5 rounded-3xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto no-scrollbar">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">Personal Profile</span>
              <ProfileBadges profile={accessibilityProfile} />
            </div>
          </div>
          <Link to="/profile" className="text-xs font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-4 shrink-0">
            Edit Preferences →
          </Link>
        </div>
      )}

      {/* Grid: Active Journey + Live Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Journey Card */}
          {activeJourney && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400" /> Active Journey Tracker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  LIVE TRACKING
                </span>
              </div>

              <Card className="p-6 border-l-4 border-l-emerald-500 bg-gradient-to-r from-dark-850 to-dark-900 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span>{activeJourney.originName}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span className="font-bold text-white">{activeJourney.destinationName}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{activeJourney.routeName}</h3>
                  </div>
                  <Badge variant="glow">In Progress</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 my-2 border-y border-white/10">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected Arrival</span>
                    <span className="text-lg font-black text-emerald-400">{activeJourney.eta ? new Date(activeJourney.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '28 min'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Safety Heartbeat</span>
                    {activeJourney.safetySession ? (
                      <SafetyStatusBadge status={activeJourney.safetySession.status} />
                    ) : (
                      <span className="text-xs text-slate-400">Active</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Crowding Level</span>
                    <CrowdingIndicator level={activeJourney.crowding} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link to={`/journey/${activeJourney.id}`}>
                    <Button variant="primary" size="sm">
                      Open Live Navigation <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </section>
          )}

          {/* Quick Route Search Preset Trigger */}
          <section className="bg-dark-900/60 border border-white/10 p-6 rounded-3xl space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" /> Quick Trip Launcher
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/plan')}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all hover:border-emerald-400/40 group flex items-center justify-between"
              >
                <div>
                  <span className="text-xs text-emerald-400 font-bold block">Frequent Route</span>
                  <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Campus Gate → Patia Chowk</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Route C3 • 0 Stairs • 28m</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/plan')}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all hover:border-cyan-400/40 group flex items-center justify-between"
              >
                <div>
                  <span className="text-xs text-cyan-400 font-bold block">Hospital Transit</span>
                  <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Infocity → KIMS Hospital</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Route C5 • Electric Ramp • 18m</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>
            </div>
          </section>

          {/* Recent Journeys History List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Recent Trips
              </h2>
              <Link to="/journeys" className="text-xs font-bold text-purple-400 hover:text-purple-300">
                View Full Log →
              </Link>
            </div>

            <div className="space-y-3">
              {journeyHistory?.slice(0, 3).map(journey => (
                <div key={journey.id} className="p-4 rounded-2xl bg-dark-900/60 border border-white/10 flex items-center justify-between hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{journey.originName} → {journey.destinationName}</div>
                      <div className="text-xs text-slate-400">{journey.routeName} • {journey.duration} mins</div>
                    </div>
                  </div>
                  <Badge variant="success">Match {journey.scores?.overall || 88}%</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Live Conditions Stream */}
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Live Route Telemetry
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <Card className="p-0 overflow-hidden bg-dark-900/80 divide-y divide-white/10">
              {Object.entries(state.transportConditions && Object.keys(state.transportConditions).length > 0 ? state.transportConditions : DEMO_CONDITIONS).map(([routeId, cond], i) => (
                <div key={i} className="p-4 space-y-2 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-sm">Route {routeId}</span>
                    </div>
                    <LastUpdated timestamp={cond.updatedAt} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DelayBadge delay={cond.delay} />
                    <CrowdingIndicator level={cond.crowding} />
                    <VehicleAccessibilityBadge status={cond.accessibility} />
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
