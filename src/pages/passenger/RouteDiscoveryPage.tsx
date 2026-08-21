import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge, ProgressBar, RadialScore, Modal } from '../../components/ui';
import { CrowdingIndicator, VehicleAccessibilityBadge, DelayBadge, SafetyStatusBadge } from '../../components/accessibility';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Clock, Activity, CheckCircle, ChevronRight, Scale } from 'lucide-react';
import type { RouteSearchResult } from '../../types';

// Fix leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const RouteDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, startJourney } = useAppStore();
  const { searchResults } = state;
  const [selectedRoute, setSelectedRoute] = useState<RouteSearchResult | null>(searchResults[0] || null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">No Routes Found</h2>
        <Button onClick={() => navigate('/plan')}>Return to Planner</Button>
      </div>
    );
  }

  const handleStartJourney = () => {
    if (selectedRoute) {
      startJourney(selectedRoute);
      navigate('/app');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommended Routes</h1>
          <p className="text-gray-500">Optimized for your accessibility profile</p>
        </div>
        <Button variant="outline" onClick={() => setShowCompareModal(true)}>
          <Scale className="w-4 h-4 mr-2" /> Compare Routes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
          {searchResults.map((result, idx) => (
            <Card 
              key={idx} 
              className={`p-4 cursor-pointer transition-all ${selectedRoute?.route.id === result.route.id ? 'border-primary-500 ring-1 ring-primary-500 shadow-md bg-primary-50' : 'hover:border-primary-300'}`}
              onClick={() => setSelectedRoute(result)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">{result.route.shortName}</span>
                  {result.recommendation.recommended && <Badge variant="success">Best Match</Badge>}
                </div>
                <RadialScore score={result.scores.overall} size="md" />
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm mb-3">
                <div className="flex items-center text-gray-600"><Clock className="w-4 h-4 mr-1" /> {result.duration} min</div>
                <div className="flex items-center text-gray-600"><Activity className="w-4 h-4 mr-1" /> {result.walkingDistance}m walk</div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <CrowdingIndicator level={result.crowding} />
                <VehicleAccessibilityBadge status={result.vehicleAccessible} />
                {result.delay > 0 && <DelayBadge delay={result.delay} />}
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedRoute && (
            <Card className="p-6">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold">Route Details: {selectedRoute.route.name}</h2>
                <Button onClick={() => setShowConfirmModal(true)}>Start Journey <ChevronRight className="w-4 h-4 ml-2" /></Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Why we recommend this:</h3>
                  <ul className="space-y-2">
                    {selectedRoute.recommendation.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" /> {reason}
                      </li>
                    ))}
                  </ul>
                  {selectedRoute.recommendation.tradeoff && (
                    <div className="mt-3 text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                      <strong>Trade-off:</strong> {selectedRoute.recommendation.tradeoff}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Score Breakdown:</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Accessibility</span><span>{selectedRoute.scores.accessibility}%</span></div>
                      <ProgressBar value={selectedRoute.scores.accessibility} color="primary" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Safety</span><span>{selectedRoute.scores.safety}%</span></div>
                      <ProgressBar value={selectedRoute.scores.safety} color="success" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Reliability</span><span>{selectedRoute.scores.reliability}%</span></div>
                      <ProgressBar value={selectedRoute.scores.reliability} color="warning" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
                <MapContainer center={[20.3500, 85.8150]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {selectedRoute.route.stops.map((stop, i) => {
                     // In a real app we'd map stopId to coordinates
                     return null;
                  })}
                </MapContainer>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Start Journey">
        <div className="p-4 space-y-4">
          <p>Are you ready to begin your journey on <strong>{selectedRoute?.route.shortName}</strong>?</p>
          <p className="text-sm text-gray-500">Your safety tracking will begin immediately. You can check in at any time.</p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button onClick={handleStartJourney}>Begin Journey</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCompareModal} onClose={() => setShowCompareModal(false)} title="Compare Routes">
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">Feature</th>
                {searchResults.map(r => <th key={r.route.id} className="p-3 font-bold">{r.route.shortName}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-3 font-medium">Overall Score</td>{searchResults.map(r => <td key={r.route.id} className="p-3"><RadialScore score={r.scores.overall} size="sm" /></td>)}</tr>
              <tr className="border-b"><td className="p-3 font-medium">Duration</td>{searchResults.map(r => <td key={r.route.id} className="p-3">{r.duration} min</td>)}</tr>
              <tr className="border-b"><td className="p-3 font-medium">Walking</td>{searchResults.map(r => <td key={r.route.id} className="p-3">{r.walkingDistance} m</td>)}</tr>
              <tr className="border-b"><td className="p-3 font-medium">Crowding</td>{searchResults.map(r => <td key={r.route.id} className="p-3"><CrowdingIndicator level={r.crowding} /></td>)}</tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default RouteDiscoveryPage;
