import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge, ProgressBar, RadialScore, Modal } from '../../components/ui';
import { CrowdingIndicator, VehicleAccessibilityBadge, DelayBadge } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation,
  Clock,
  Activity,
  CheckCircle2,
  ChevronRight,
  Scale,
  MapPin,
  Bus,
  Footprints,
  AlertTriangle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { RouteSearchResult } from '../../types';

// Custom Markers
const originIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #2563EB; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">A</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const destIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #DC2626; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">B</div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const stopMarkerIcon = L.divIcon({
  className: 'custom-stop',
  html: '<div style="background-color: #059669; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Auto-Fit Bounds Component
function MapBoundsFitter({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

export default function RouteDiscoveryPage() {
  const navigate = useNavigate();
  const { state, startJourney } = useAppStore();
  const { searchResults } = state;

  const [selectedRoute, setSelectedRoute] = useState<RouteSearchResult | null>(
    searchResults[0] || null
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    if (searchResults.length > 0 && !selectedRoute) {
      setSelectedRoute(searchResults[0] || null);
    }
  }, [searchResults, selectedRoute]);

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          <Navigation className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">No Routes Found</h2>
        <p className="text-gray-500 mb-6">Please choose origin and destination points in the journey planner.</p>
        <Button onClick={() => navigate('/plan')} className="bg-primary-600 hover:bg-primary-700">
          Return to Planner
        </Button>
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

  // Build full coordinate list for map auto-fit
  const allCoordinates: Array<[number, number]> = [];
  if (selectedRoute?.geometry?.fullRoute && selectedRoute.geometry.fullRoute.length > 0) {
    allCoordinates.push(...selectedRoute.geometry.fullRoute);
  } else if (selectedRoute?.originCoords && selectedRoute?.destinationCoords) {
    allCoordinates.push(
      [selectedRoute.originCoords.lat, selectedRoute.originCoords.lng],
      [selectedRoute.destinationCoords.lat, selectedRoute.destinationCoords.lng]
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Recommended Transit Routes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ranked by accessibility compliance, crowd reduction, and safety preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowCompareModal(true)}>
            <Scale className="w-4 h-4 mr-1.5" /> Compare Options
          </Button>
          <Button size="sm" onClick={() => navigate('/plan')}>
            New Search
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Route Cards */}
        <div className="lg:col-span-5 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          {searchResults.map((result, idx) => {
            const isSelected = selectedRoute?.route.id === result.route.id;
            return (
              <Card
                key={idx}
                className={`p-4 cursor-pointer transition-all border rounded-2xl ${
                  isSelected
                    ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-lg bg-primary-50/40'
                    : 'border-gray-200 hover:border-primary-300 bg-white hover:shadow-md'
                }`}
                onClick={() => setSelectedRoute(result)}
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-white font-extrabold text-sm shadow-sm"
                      style={{ backgroundColor: result.route.color || '#059669' }}
                    >
                      {result.route.shortName}
                    </span>
                    <span className="font-bold text-gray-900 text-sm line-clamp-1">
                      {result.route.name}
                    </span>
                  </div>
                  <RadialScore score={result.scores.overall} size="sm" />
                </div>

                {result.recommendation.recommended && (
                  <div className="mb-2">
                    <Badge variant="success" className="text-[11px] font-semibold">
                      ★ Best Accessibility Match
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 my-2 bg-white/70 p-2 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{result.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium">
                    <Footprints className="w-3.5 h-3.5 text-gray-500" />
                    <span>{result.walkingDistance}m walk</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium">
                    <Bus className="w-3.5 h-3.5 text-gray-500" />
                    <span>{result.stairs === 0 ? 'No stairs' : `${result.stairs} stairs`}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <CrowdingIndicator level={result.crowding} />
                  <VehicleAccessibilityBadge status={result.vehicleAccessible} />
                  {result.delay > 0 && <DelayBadge delay={result.delay} />}
                </div>

                {result.recommendation.tradeoff && (
                  <div className="mt-2.5 text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{result.recommendation.tradeoff}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Right Column: Interactive Map & Turn-by-Turn Leg Details */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRoute && (
            <Card className="p-5 shadow-xl border border-gray-200 bg-white rounded-2xl">
              {/* Route Summary Header */}
              <div className="flex flex-wrap justify-between items-center border-b pb-4 mb-4 gap-3">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Selected Journey
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mt-0.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedRoute.route.color || '#059669' }}
                    ></span>
                    {selectedRoute.route.name}
                  </h2>
                </div>
                <Button
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 px-5"
                  onClick={() => setShowConfirmModal(true)}
                >
                  Start Live Journey <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

              {/* Leaflet Google Maps Style Map */}
              <div className="h-72 w-full rounded-xl overflow-hidden border border-gray-200 relative mb-5 shadow-inner">
                <MapContainer
                  center={
                    selectedRoute.originCoords
                      ? [selectedRoute.originCoords.lat, selectedRoute.originCoords.lng]
                      : [20.3533, 85.8164]
                  }
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapBoundsFitter points={allCoordinates} />

                  {/* Origin Marker */}
                  {selectedRoute.originCoords && (
                    <Marker
                      position={[selectedRoute.originCoords.lat, selectedRoute.originCoords.lng]}
                      icon={originIcon}
                    >
                      <Popup>
                        <strong>Origin (A)</strong>
                        <br />
                        {selectedRoute.originName || 'Starting Location'}
                      </Popup>
                    </Marker>
                  )}

                  {/* Destination Marker */}
                  {selectedRoute.destinationCoords && (
                    <Marker
                      position={[selectedRoute.destinationCoords.lat, selectedRoute.destinationCoords.lng]}
                      icon={destIcon}
                    >
                      <Popup>
                        <strong>Destination (B)</strong>
                        <br />
                        {selectedRoute.destinationName || 'Destination Location'}
                      </Popup>
                    </Marker>
                  )}

                  {/* Intermediate / Transit Stops */}
                  {(selectedRoute.intermediateStops || []).map((stop, sIdx) => (
                    <Marker
                      key={sIdx}
                      position={[stop.latitude, stop.longitude]}
                      icon={stopMarkerIcon}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>Stop: {stop.name}</strong>
                          <div className="text-gray-500 mt-0.5">
                            {stop.hasRamp ? '✓ Ramp Available' : 'Standard Stop'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* 1. Walk from origin to board stop (Blue dashed) */}
                  {selectedRoute.geometry?.originToBoardWalk &&
                    selectedRoute.geometry.originToBoardWalk.length > 0 && (
                      <Polyline
                        positions={selectedRoute.geometry.originToBoardWalk}
                        pathOptions={{ color: '#2563EB', weight: 4, dashArray: '6, 6', opacity: 0.8 }}
                      />
                    )}

                  {/* 2. Transit Road Path (Solid vibrant line matching route color) */}
                  {selectedRoute.geometry?.transitPath &&
                    selectedRoute.geometry.transitPath.length > 0 && (
                      <Polyline
                        positions={selectedRoute.geometry.transitPath}
                        pathOptions={{
                          color: selectedRoute.route.color || '#059669',
                          weight: 6,
                          opacity: 0.9,
                        }}
                      />
                    )}

                  {/* 3. Walk from alight stop to destination (Red dashed) */}
                  {selectedRoute.geometry?.alightToDestWalk &&
                    selectedRoute.geometry.alightToDestWalk.length > 0 && (
                      <Polyline
                        positions={selectedRoute.geometry.alightToDestWalk}
                        pathOptions={{ color: '#DC2626', weight: 4, dashArray: '6, 6', opacity: 0.8 }}
                      />
                    )}
                </MapContainer>
              </div>

              {/* Turn-by-Turn Leg Steps */}
              <div className="space-y-3 mb-5">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Journey Directions & Steps
                </h3>
                <div className="space-y-2">
                  {selectedRoute.turnByTurn && selectedRoute.turnByTurn.length > 0 ? (
                    selectedRoute.turnByTurn.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-800"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          {sIdx + 1}
                        </div>
                        <div className="flex-1 font-medium">{step}</div>
                      </div>
                    ))
                  ) : (
                    selectedRoute.segments.map((seg, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-800"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                          {sIdx + 1}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold capitalize">{seg.type}</span> from {seg.from} to {seg.to} ({seg.duration} min)
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Score Breakdown & Decision Reasons */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">
                    Why ACCESS Recommends This:
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedRoute.recommendation.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start text-xs text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-2">
                    Accessibility & Safety Scores:
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1 text-[11px] font-semibold">
                        <span>Accessibility Match</span>
                        <span>{selectedRoute.scores.accessibility}%</span>
                      </div>
                      <ProgressBar value={selectedRoute.scores.accessibility} color="primary" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-[11px] font-semibold">
                        <span>Safety & Lighting</span>
                        <span>{selectedRoute.scores.safety}%</span>
                      </div>
                      <ProgressBar value={selectedRoute.scores.safety} color="success" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-[11px] font-semibold">
                        <span>Reliability & Telemetry</span>
                        <span>{selectedRoute.scores.reliability}%</span>
                      </div>
                      <ProgressBar value={selectedRoute.scores.reliability} color="warning" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Start Journey Confirmation Modal */}
      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Start Live Safe Journey">
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-700">
            You are initiating live transit tracking on <strong>{selectedRoute?.route.name}</strong>.
          </p>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
            <div className="font-bold">Active Proactive Safety Monitoring:</div>
            <div>• Real-time heartbeat check-in interval: 10 minutes</div>
            <div>• Automated overdue escalation if delayed past ETA + 5 min</div>
            <div>• Emergency contact notified if unresolved past ETA + 15 min</div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartJourney} className="bg-primary-600 hover:bg-primary-700">
              Start Safety Navigation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Compare Routes Modal */}
      <Modal open={showCompareModal} onClose={() => setShowCompareModal(false)} title="Compare Transit Options">
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2.5 font-bold">Parameter</th>
                {searchResults.map((r) => (
                  <th key={r.route.id} className="p-2.5 font-extrabold text-primary-700">
                    {r.route.shortName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2.5 font-semibold text-gray-700">Overall Score</td>
                {searchResults.map((r) => (
                  <td key={r.route.id} className="p-2.5 font-bold">
                    {r.scores.overall}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-gray-700">Duration</td>
                {searchResults.map((r) => (
                  <td key={r.route.id} className="p-2.5">
                    {r.duration} min
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-gray-700">Walking Distance</td>
                {searchResults.map((r) => (
                  <td key={r.route.id} className="p-2.5">
                    {r.walkingDistance}m
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-gray-700">Wheelchair Ramp</td>
                {searchResults.map((r) => (
                  <td key={r.route.id} className="p-2.5 font-semibold">
                    {r.vehicleAccessible ? '✓ Available' : '✗ Unavailable'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2.5 font-semibold text-gray-700">Crowding Level</td>
                {searchResults.map((r) => (
                  <td key={r.route.id} className="p-2.5 font-medium">
                    {r.crowding}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
