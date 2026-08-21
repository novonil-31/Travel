import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge, ProgressBar, RadialScore, Modal } from '../../components/ui';
import { CrowdingIndicator, VehicleAccessibilityBadge, DelayBadge } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Clock, Activity, CheckCircle, Scale, Bus, MapPin, ChevronRight, ShieldCheck } from 'lucide-react';
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

  useEffect(() => {
    if (searchResults.length > 0 && !selectedRoute) {
      setSelectedRoute(searchResults[0] || null);
    }
  }, [searchResults, selectedRoute]);

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-black text-neutral-900">No Routes Found</h2>
        <p className="text-sm text-neutral-600">Please choose an origin and destination to plan your accessible journey.</p>
        <Button onClick={() => navigate('/plan')}>Return to Trip Planner</Button>
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
    [20.3555, 85.8145],
    [20.3570, 85.8170],
    [20.3530, 85.8160],
    [20.3450, 85.8180],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Accessible Route Matrix</span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-0.5">
            Select Your Preferred Ride
          </h1>
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowCompareModal(true)}>
          <Scale className="w-4 h-4 mr-1.5" /> Compare Routes
        </Button>
      </div>

      {/* Grid: Route Cards (Left) + Interactive Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Route Options */}
        <div className="lg:col-span-5 space-y-3.5">
          {searchResults.map((result, idx) => {
            const isSelected = selectedRoute?.route.id === result.route.id;
            return (
              <div
                key={idx}
                onClick={() => setSelectedRoute(result)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-50 border-black ring-2 ring-black shadow-md'
                    : 'bg-white border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/60 shadow-sm'
                }`}
              >
                {result.recommendation.recommended && (
                  <div className="mb-2.5">
                    <span className="inline-block bg-black text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      ★ Recommended for Wheelchair User
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center font-bold text-sm text-neutral-900">
                        {result.route.shortName}
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900 text-base">{result.route.name}</h3>
                        <span className="text-xs text-neutral-500">{result.route.description}</span>
                      </div>
                    </div>
                  </div>
                  <RadialScore score={result.scores.overall} size="sm" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-neutral-200 text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Total Time</span>
                    <span className="font-bold text-neutral-900 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-600" /> {result.duration} min
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Walking</span>
                    <span className="font-bold text-neutral-900 flex items-center gap-1 mt-0.5">
                      <Activity className="w-3.5 h-3.5 text-neutral-600" /> {result.walkingDistance}m
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">Stairs</span>
                    <span className={`font-bold mt-0.5 block ${result.stairs === 0 ? 'text-emerald-700' : 'text-neutral-900'}`}>
                      {result.stairs === 0 ? '0 Stairs (Flat)' : `${result.stairs} Flights`}
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <CrowdingIndicator level={result.crowding} />
                  <VehicleAccessibilityBadge status={result.vehicleAccessible} />
                  {result.delay > 0 && <DelayBadge delay={result.delay} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Route Preview & Live Map */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRoute && (
            <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
                <div>
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Selected Itinerary</span>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900">{selectedRoute.route.name}</h2>
                </div>
                <Button size="lg" onClick={() => setShowConfirmModal(true)}>
                  Choose {selectedRoute.route.shortName} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Factors */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">Accessibility Highlights:</span>
                <ul className="space-y-1.5">
                  {selectedRoute.recommendation.reasons.map((reason, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Map View */}
              <div className="h-72 w-full rounded-2xl overflow-hidden border border-neutral-200">
                <MapContainer center={[20.3530, 85.8160]} zoom={14} scrollWheelZoom={false} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polyline positions={polylineCoords} color="#000000" weight={5} opacity={0.8} />
                  <Marker position={[20.3555, 85.8145]}>
                    <Popup><strong>Campus Gate</strong><br />Origin • Accessible Ramp</Popup>
                  </Marker>
                  <Marker position={[20.3450, 85.8180]}>
                    <Popup><strong>Patia Station</strong><br />Destination</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Route Selection">
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Start navigation for <strong className="text-neutral-900">{selectedRoute?.route.name}</strong>?
          </p>
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-neutral-800 shrink-0" />
            <span className="text-xs text-neutral-700">
              Safety check-in heartbeat active during transit.
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleStartJourney}>Start Journey Now</Button>
          </div>
        </div>
      </Modal>

      {/* Compare Modal */}
      <Modal open={showCompareModal} onClose={() => setShowCompareModal(false)} title="Route Comparison" size="lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="p-3 text-neutral-600 font-bold uppercase">Attribute</th>
                {searchResults.map(r => (
                  <th key={r.route.id} className="p-3 font-bold text-neutral-900">
                    {r.route.shortName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="p-3 text-neutral-500 font-medium">Match Score</td>
                {searchResults.map(r => <td key={r.route.id} className="p-3 font-bold text-emerald-700">{r.scores.overall}%</td>)}
              </tr>
              <tr>
                <td className="p-3 text-neutral-500 font-medium">Duration</td>
                {searchResults.map(r => <td key={r.route.id} className="p-3 font-bold text-neutral-900">{r.duration} min</td>)}
              </tr>
              <tr>
                <td className="p-3 text-neutral-500 font-medium">Stairs</td>
                {searchResults.map(r => <td key={r.route.id} className="p-3 font-medium">{r.stairs === 0 ? '0 (Flat)' : `${r.stairs} Flights`}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
