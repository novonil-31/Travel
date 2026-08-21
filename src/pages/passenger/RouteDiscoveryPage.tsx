import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge, ProgressBar, RadialScore, Modal } from '../../components/ui';
import { CrowdingIndicator, VehicleAccessibilityBadge, DelayBadge } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Clock, Activity, CheckCircle, ChevronRight, Scale, Bus, MapPin, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { RouteSearchResult } from '../../types';

// Fix leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function RouteDiscoveryPage() {
  const navigate = useNavigate();
  const { state, startJourney } = useAppStore();
  const { searchResults } = state;
  const [selectedRoute, setSelectedRoute] = useState<RouteSearchResult | null>(searchResults[0] || null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'routes' | 'map'>('routes');

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mx-auto">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">No Routes Found</h2>
        <p className="text-sm text-slate-400">Try changing your origin or destination in the planner.</p>
        <Button onClick={() => navigate('/plan')}>Return to Planner</Button>
      </div>
    );
  }

  const handleStartJourney = () => {
    if (selectedRoute) {
      startJourney(selectedRoute);
      setShowConfirmModal(false);
      navigate(`/journey/journey-${Date.now()}`);
    }
  };

  const polylineCoords: [number, number][] = [
    [20.3555, 85.8145], // Campus Gate
    [20.3570, 85.8170], // Hospital
    [20.3530, 85.8160], // KIIT Square
    [20.3450, 85.8180], // Patia
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              AI Multi-Factor Match
            </span>
            <span className="text-xs text-slate-400">{searchResults.length} Route Options</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Recommended Routes for You
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile view toggle (Routes vs Map) */}
          <div className="sm:hidden flex bg-dark-950 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setMobileTab('routes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${mobileTab === 'routes' ? 'bg-emerald-500 text-dark-950 font-bold' : 'text-slate-400'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setMobileTab('map')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${mobileTab === 'map' ? 'bg-emerald-500 text-dark-950 font-bold' : 'text-slate-400'}`}
            >
              Map
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowCompareModal(true)}>
            <Scale className="w-4 h-4 mr-1.5 text-cyan-400" /> Compare All
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Route Cards + Right Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Route Cards Column (Left) */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'map' ? 'hidden sm:block' : ''}`}>
          {searchResults.map((result, idx) => {
            const isSelected = selectedRoute?.route.id === result.route.id;
            return (
              <div
                key={idx}
                onClick={() => setSelectedRoute(result)}
                className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer backdrop-blur-xl relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-dark-800 to-dark-850 border-emerald-500/60 shadow-glow-green ring-1 ring-emerald-400/40'
                    : 'bg-dark-900/60 border-white/10 hover:border-white/20 hover:bg-dark-850/60'
                }`}
              >
                {/* Recommended Top Badge */}
                {result.recommendation.recommended && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md">
                      ⭐ Recommended for Wheelchair Profile
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                        {result.route.shortName}
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base">{result.route.name}</h3>
                        <span className="text-xs text-slate-400">{result.route.description}</span>
                      </div>
                    </div>
                  </div>
                  <RadialScore score={result.scores.overall} size="sm" />
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Time</span>
                    <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> {result.duration} min
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Walking</span>
                    <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" /> {result.walkingDistance}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Stairs Count</span>
                    <span className={`font-bold flex items-center gap-1 mt-0.5 ${result.stairs === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {result.stairs === 0 ? '0 Stairs (Flat)' : `${result.stairs} Flights`}
                    </span>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3">
                  <CrowdingIndicator level={result.crowding} />
                  <VehicleAccessibilityBadge status={result.vehicleAccessible} />
                  {result.delay > 0 && <DelayBadge delay={result.delay} />}
                </div>

                {/* Trade-off summary text */}
                {result.recommendation.tradeoff && (
                  <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                    <span className="text-emerald-300 font-bold">Trade-off: </span>
                    {result.recommendation.tradeoff}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Route Details & Interactive Map Column (Right) */}
        <div className={`lg:col-span-7 space-y-6 ${mobileTab === 'routes' ? 'hidden sm:block' : ''}`}>
          {selectedRoute && (
            <div className="bg-dark-900/80 backdrop-blur-2xl border border-white/15 p-6 rounded-3xl shadow-2xl space-y-6">
              {/* Top Details Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Selected Itinerary</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedRoute.route.name}</h2>
                </div>
                <Button size="lg" className="shadow-glow-green" onClick={() => setShowConfirmModal(true)}>
                  Start Journey Now <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>

              {/* Reasons & Score Breakdown */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 bg-dark-950/60 p-4 rounded-2xl border border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Key Recommendation Factors
                  </h3>
                  <ul className="space-y-2">
                    {selectedRoute.recommendation.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 bg-dark-950/60 p-4 rounded-2xl border border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Score Evaluation</h3>
                  <div className="space-y-2.5">
                    <ProgressBar label="Accessibility Match" value={selectedRoute.scores.accessibility} color="bg-gradient-to-r from-emerald-400 to-teal-400" />
                    <ProgressBar label="Safety Rating" value={selectedRoute.scores.safety} color="bg-gradient-to-r from-cyan-400 to-blue-400" />
                    <ProgressBar label="Transit Reliability" value={selectedRoute.scores.reliability} color="bg-gradient-to-r from-indigo-400 to-purple-400" />
                  </div>
                </div>
              </div>

              {/* Interactive Map View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider">Live Route Map</span>
                  <span>Campus Zone • Bhubaneswar</span>
                </div>
                <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner">
                  <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={false} className="w-full h-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polyline positions={polylineCoords} color="#10b981" weight={5} opacity={0.8} />
                    <Marker position={[20.3555, 85.8145]}>
                      <Popup><strong className="text-dark-950">Campus Gate</strong><br />Origin • Accessible Ramp</Popup>
                    </Marker>
                    <Marker position={[20.3450, 85.8180]}>
                      <Popup><strong className="text-dark-950">Patia Station</strong><br />Destination • Level Sidewalk</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start Journey Confirmation Modal */}
      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Journey Departure">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            You are about to start navigation on <strong className="text-white">{selectedRoute?.route.name}</strong>.
          </p>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-300">
              <strong>Proactive Safety Watchdog:</strong> 10-minute automated safety heartbeat will monitor your trip and notify emergency contact if assistance is needed.
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleStartJourney}>Begin Journey Now</Button>
          </div>
        </div>
      </Modal>

      {/* Side-by-Side Route Comparison Modal */}
      <Modal open={showCompareModal} onClose={() => setShowCompareModal(false)} title="Side-by-Side Route Matrix" size="lg">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-white/15 bg-white/5">
                <th className="p-3 text-slate-400 font-bold uppercase">Attribute</th>
                {searchResults.map(r => (
                  <th key={r.route.id} className="p-3 font-bold text-white">
                    {r.route.shortName} {r.recommendation.recommended ? '⭐' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr>
                <td className="p-3 text-slate-400 font-medium">Overall Score</td>
                {searchResults.map(r => (
                  <td key={r.route.id} className="p-3 font-black text-emerald-400 text-sm">
                    {r.scores.overall}/100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-slate-400 font-medium">Duration</td>
                {searchResults.map(r => <td key={r.route.id} className="p-3 text-white font-bold">{r.duration} min</td>)}
              </tr>
              <tr>
                <td className="p-3 text-slate-400 font-medium">Walking Distance</td>
                {searchResults.map(r => <td key={r.route.id} className="p-3 text-white">{r.walkingDistance} m</td>)}
              </tr>
              <tr>
                <td className="p-3 text-slate-400 font-medium">Stairs</td>
                {searchResults.map(r => (
                  <td key={r.route.id} className={`p-3 font-bold ${r.stairs === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.stairs === 0 ? 'None (Flat)' : `${r.stairs} Flights`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-slate-400 font-medium">Crowding</td>
                {searchResults.map(r => <td key={r.route.id} className="p-3"><CrowdingIndicator level={r.crowding} /></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
