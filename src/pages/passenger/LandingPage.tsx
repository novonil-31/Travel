import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Navigation, CheckCircle, ArrowRight, Accessibility, HeartPulse, MapPin, Eye, Volume2, Users, Clock } from 'lucide-react';
import { RadialScore } from '../../components/ui';

export default function LandingPage() {
  const [activePersona, setActivePersona] = useState<'wheelchair' | 'elderly' | 'night'>('wheelchair');

  const personaConfig = {
    wheelchair: {
      name: 'Aarav (Wheelchair User)',
      profile: 'Zero Stairs • Ramp Vehicle • Low Crowds',
      route: 'Route C3 (Recommended)',
      score: 92,
      duration: '28 min',
      benefit: 'Avoids 2 flights of stairs at underpass and confirms low-floor bus with electric ramp.',
    },
    elderly: {
      name: 'Meera (Senior Citizen)',
      profile: 'Minimal Walking • Flat Terrain • Shelter',
      route: 'Route S1 + C3 (Recommended)',
      score: 89,
      duration: '24 min',
      benefit: 'Shortest walking distance (120m) with fully sheltered stops and bench seating.',
    },
    night: {
      name: 'Rohan (Late Night Traveler)',
      profile: 'Well-Lit Paths • Verified Safety • CCTV',
      route: 'Route C5 Express (Recommended)',
      score: 95,
      duration: '30 min',
      benefit: 'High-security corridor with active CCTV coverage, 10-min safety check-in heartbeat.',
    },
  };

  const current = personaConfig[activePersona];

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 font-sans selection:bg-emerald-400 selection:text-dark-950 relative overflow-hidden">
      {/* Background Glow Mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-mesh-dark pointer-events-none opacity-80" />

      {/* Top Navbar */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-glow-green">
            <Accessibility className="w-6 h-6 text-dark-950 font-black" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">ACCESS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/demo" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all">
            <Sparkles className="w-3.5 h-3.5" /> Demo HUD
          </Link>
          <Link to="/app" className="px-5 py-2.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:from-emerald-400 hover:to-teal-400 transition-all">
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold backdrop-blur-md shadow-glow-green animate-float">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Problem Statement PS-05 • HACQUIRE 2026 Winner</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
            Not the fastest route. <br />
            <span className="gradient-text-emerald">The BEST route for YOU.</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 font-normal max-w-2xl mx-auto leading-relaxed">
            Standard transit apps blindly optimize for minutes. <strong className="text-white">ACCESS</strong> calculates personalized accessibility scores, eliminates physical barriers, and protects you with proactive safety check-ins.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/plan" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-dark-950 font-black text-base shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Navigation className="w-5 h-5" /> Plan Accessible Journey
            </Link>
            <Link to="/demo/pitch" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-base backdrop-blur-md transition-all flex items-center justify-center gap-2">
              View Hackathon Pitch <ArrowRight className="w-5 h-5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Interactive Persona & Routing Showcase Card */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-dark-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">Interactive Routing Engine Simulator</span>
                <h2 className="text-xl sm:text-2xl font-black text-white">See How ACCESS Re-Ranks Routes</h2>
              </div>

              {/* Persona Selector Tabs */}
              <div className="flex bg-dark-950 p-1.5 rounded-2xl border border-white/10 gap-1 self-start sm:self-auto overflow-x-auto">
                <button
                  onClick={() => setActivePersona('wheelchair')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${activePersona === 'wheelchair' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Wheelchair
                </button>
                <button
                  onClick={() => setActivePersona('elderly')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${activePersona === 'elderly' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Senior
                </button>
                <button
                  onClick={() => setActivePersona('night')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${activePersona === 'night' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Night Safety
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 items-center">
              <div className="sm:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    <Accessibility className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{current.name}</h3>
                    <p className="text-xs text-slate-400">{current.profile}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{current.route}</span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {current.duration}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    💡 <strong className="text-emerald-300">Decision Reason:</strong> {current.benefit}
                  </p>
                </div>
              </div>

              <div className="sm:col-span-1 flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20">
                <RadialScore score={current.score} size="lg" />
                <span className="text-xs text-slate-400 mt-2 font-medium">Match Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform shadow-glow-green">
              <Accessibility className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Zero-Barrier Routing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Filters out impassable stairs, broken lifts, and unpaved curbs in real time using verified station telemetry.
            </p>
          </div>

          <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-cyan-500/40 transition-all hover:-translate-y-1 group shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform shadow-glow-cyan">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Proactive Safety HUD</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scheduled safety heartbeats with automatic escalation to emergency contacts if a check-in is overdue.
            </p>
          </div>

          <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-amber-500/40 transition-all hover:-translate-y-1 group shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform shadow-glow-amber">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Live Crowding AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time vehicle density metrics ensure vulnerable users are never forced into overcrowded compartments.
            </p>
          </div>

          <div className="bg-dark-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all hover:-translate-y-1 group shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Operator Dispatch Loop</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Two-way communication between fleet managers and passengers for instant route condition recalculation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-dark-950/80 py-8 px-6 text-center text-xs text-slate-500">
        ACCESS • Accessible Public Transport Assistant • Built for HACQUIRE 2026
      </footer>
    </div>
  );
}
