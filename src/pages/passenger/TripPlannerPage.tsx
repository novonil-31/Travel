import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge } from '../../components/ui';
import { stopsApi, journeysApi } from '../../api';
import {
  Navigation,
  MapPin,
  ArrowUpDown,
  Accessibility,
  Search,
  Crosshair,
  Loader2,
  Bus,
  CheckCircle2,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteSearchResult } from '../../types';

// Marker Icons
const originIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #2563EB; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">A</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div style="background-color: #DC2626; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">B</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const stopIcon = L.divIcon({
  className: 'custom-stop-marker',
  html: '<div style="background-color: #059669; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface PlaceSuggestion {
  displayName: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  isStop?: boolean;
}

// Preset popular places in Bhubaneswar
const POPULAR_HUBS: PlaceSuggestion[] = [
  { name: 'KIIT Square / Campus Gate', displayName: 'KIIT Square, Patia, Bhubaneswar', lat: 20.3533, lng: 85.8164, isStop: true },
  { name: 'Patia Square / Big Bazaar', displayName: 'Patia Chowk, Nandankanan Road, Bhubaneswar', lat: 20.3625, lng: 85.8241, isStop: true },
  { name: 'Infocity IT Corridor', displayName: 'Infocity Road, Chandaka SEZ, Bhubaneswar', lat: 20.3585, lng: 85.8198, isStop: true },
  { name: 'Master Canteen Railway Station', displayName: 'Bhubaneswar Central Railway Station, Master Canteen', lat: 20.2644, lng: 85.8398, isStop: true },
  { name: 'Jayadev Vihar Junction', displayName: 'Jayadev Vihar Overbridge, National Highway 16', lat: 20.3012, lng: 85.8245, isStop: true },
  { name: 'Biju Patnaik Airport (BBI)', displayName: 'Airport Road, Aerodrome Area, Bhubaneswar', lat: 20.2444, lng: 85.8178 },
];

const PROFILES = [
  { id: 'WHEELCHAIR', label: 'Wheelchair User', desc: 'Ramp required, step-free low floor, zero stairs', icon: Accessibility, color: 'text-primary-600 border-primary-500 bg-primary-50' },
  { id: 'ELDERLY', label: 'Elderly Passenger', desc: 'Minimal walk (<300m), low crowd, seat comfort', icon: Shield, color: 'text-amber-600 border-amber-500 bg-amber-50' },
  { id: 'NIGHT_TRAVELLER', label: 'Night Travel', desc: 'Well-lit stops, safe corridors, active monitoring', icon: Clock, color: 'text-purple-600 border-purple-500 bg-purple-50' },
  { id: 'GENERAL', label: 'Standard Route', desc: 'Balanced time, reliability, and cost', icon: Sparkles, color: 'text-blue-600 border-blue-500 bg-blue-50' },
];

// Map click handler component
function MapClickHandler({
  onSelectPoint,
  clickMode,
}: {
  onSelectPoint: (lat: number, lng: number) => void;
  clickMode: 'origin' | 'destination';
}) {
  useMapEvents({
    click(e) {
      onSelectPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const { setSearchResults, state } = useAppStore();

  // Location State
  const [originQuery, setOriginQuery] = useState('KIIT Square / Campus Gate');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({ lat: 20.3533, lng: 85.8164 });

  const [destQuery, setDestQuery] = useState('Patia Square / Big Bazaar');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({ lat: 20.3625, lng: 85.8241 });

  // Autocomplete Suggestions
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<string>('WHEELCHAIR');
  const [isLoading, setIsLoading] = useState(false);
  const [clickMode, setClickMode] = useState<'origin' | 'destination'>('origin');
  const [searchError, setSearchError] = useState<string | null>(null);

  const originInputRef = useRef<HTMLDivElement>(null);
  const destInputRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        originInputRef.current && !originInputRef.current.contains(event.target as Node) &&
        destInputRef.current && !destInputRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live place search with debounce
  const handleOriginSearch = async (val: string) => {
    setOriginQuery(val);
    if (val.trim().length >= 2) {
      try {
        const results = await stopsApi.searchPlaces(val);
        setOriginSuggestions(results.length > 0 ? results : POPULAR_HUBS.filter(h => h.name.toLowerCase().includes(val.toLowerCase())));
        setActiveDropdown('origin');
      } catch {
        setOriginSuggestions(POPULAR_HUBS.filter(h => h.name.toLowerCase().includes(val.toLowerCase())));
      }
    } else {
      setOriginSuggestions(POPULAR_HUBS);
    }
  };

  const handleDestSearch = async (val: string) => {
    setDestQuery(val);
    if (val.trim().length >= 2) {
      try {
        const results = await stopsApi.searchPlaces(val);
        setDestSuggestions(results.length > 0 ? results : POPULAR_HUBS.filter(h => h.name.toLowerCase().includes(val.toLowerCase())));
        setActiveDropdown('dest');
      } catch {
        setDestSuggestions(POPULAR_HUBS.filter(h => h.name.toLowerCase().includes(val.toLowerCase())));
      }
    } else {
      setDestSuggestions(POPULAR_HUBS);
    }
  };

  // Get User's Current GPS Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOriginCoords({ lat, lng });
        setOriginQuery('My Current GPS Location');
        try {
          const rev = await stopsApi.reverseGeocode(lat, lng);
          if (rev?.name) setOriginQuery(rev.name);
        } catch {
          // fallback keeps GPS label
        }
      },
      () => {
        alert('Could not retrieve your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle map click
  const handleMapPointSelected = async (lat: number, lng: number) => {
    try {
      const rev = await stopsApi.reverseGeocode(lat, lng);
      const name = rev?.name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      if (clickMode === 'origin') {
        setOriginCoords({ lat, lng });
        setOriginQuery(name);
        setClickMode('destination');
      } else {
        setDestCoords({ lat, lng });
        setDestQuery(name);
      }
    } catch {
      if (clickMode === 'origin') {
        setOriginCoords({ lat, lng });
        setOriginQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setClickMode('destination');
      } else {
        setDestCoords({ lat, lng });
        setDestQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    }
  };

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempQ = originQuery;
    const tempC = originCoords;
    setOriginQuery(destQuery);
    setOriginCoords(destCoords);
    setDestQuery(tempQ);
    setDestCoords(tempC);
  };

  // Execute Live Real-world Journey Planning
  const handlePlanJourney = async () => {
    if (!originCoords || !destCoords) return;
    setIsLoading(true);
    setSearchError(null);

    try {
      const planRes = await journeysApi.plan({
        origin: { lat: originCoords.lat, lng: originCoords.lng, name: originQuery },
        destination: { lat: destCoords.lat, lng: destCoords.lng, name: destQuery },
        profileType: selectedProfile,
      });

      if (!planRes.options || planRes.options.length === 0) {
        setSearchError('No accessible transit routes found for this journey. Please try expanding walking tolerance or choosing different points.');
        setIsLoading(false);
        return;
      }

      // Convert backend PlanOption into rich frontend RouteSearchResult
      const transformedResults: RouteSearchResult[] = planRes.options.map((opt, idx) => ({
        route: {
          id: opt.routeId,
          name: opt.routeLongName,
          shortName: opt.routeShortName,
          vehicleType: (opt.vehicleType.toLowerCase().replace('_', '-') as any) || 'bus',
          color: opt.accessibility.wheelchairCompatible ? '#059669' : '#DC2626',
          description: opt.explanation.join(' • '),
          active: true,
          stops: (opt.intermediateStops || []).map((s, sIdx) => ({
            stopId: s.id,
            order: s.sequence,
            arrivalOffset: sIdx * 3,
            departureOffset: sIdx * 3,
          })),
        },
        eta: opt.durationMinutes,
        duration: opt.durationMinutes,
        walkingDistance: opt.walkingDistanceM,
        transfers: 0,
        stairs: opt.accessibility.wheelchairCompatible ? 0 : 2,
        crowding: (opt.crowding.level.toUpperCase() as any) || 'LOW',
        vehicleAccessible: opt.accessibility.wheelchairCompatible,
        delay: 0,
        scores: {
          accessibility: Math.round(opt.scores.accessibility * 100),
          safety: Math.round(opt.scores.safety * 100),
          reliability: Math.round(opt.scores.reliability * 100),
          comfort: Math.round((1 - (opt.crowding.score || 0.2)) * 100),
          overall: Math.round(opt.scores.overall * 100),
        },
        recommendation: {
          recommended: opt.rank === 1,
          rank: opt.rank,
          reasons: opt.explanation,
          tradeoff: opt.warnings.length > 0 ? opt.warnings.join('. ') : undefined,
        },
        segments: [
          {
            type: 'walk',
            from: originQuery,
            to: opt.boardStop.name,
            duration: opt.walkingTimeMinutes,
            distance: opt.boardStop.distanceM,
            accessible: opt.accessibility.rampAvailable ?? true,
            stairs: 0,
          },
          {
            type: 'ride',
            from: opt.boardStop.name,
            to: opt.alightStop.name,
            duration: Math.max(5, opt.durationMinutes - opt.walkingTimeMinutes),
            routeId: opt.routeId,
            routeName: opt.routeShortName,
            accessible: opt.accessibility.wheelchairCompatible,
            stairs: 0,
            crowding: opt.crowding.level as any,
          },
          {
            type: 'walk',
            from: opt.alightStop.name,
            to: destQuery,
            duration: 2,
            distance: opt.alightStop.distanceM,
            accessible: true,
            stairs: 0,
          },
        ],
        condition: {
          routeId: opt.routeId,
          delay: 0,
          crowding: opt.crowding.level as any,
          accessibility: opt.accessibility.wheelchairCompatible ? 'AVAILABLE' : 'LIMITED',
          vehicleStatus: 'active',
          updatedAt: new Date().toISOString(),
        },
        // Geometries for Map Rendering
        originCoords,
        destinationCoords: destCoords,
        originName: originQuery,
        destinationName: destQuery,
        geometry: opt.geometry,
        intermediateStops: opt.intermediateStops,
        turnByTurn: opt.turnByTurn,
      }));

      setSearchResults(transformedResults);
      navigate('/routes');
    } catch (err: any) {
      setSearchError(err?.message || 'Error communicating with transit server. Please check internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Accessible Journey Planner
        </h1>
        <p className="text-gray-600 mt-2 text-base max-w-2xl mx-auto">
          Google Maps-style real-time route discovery. Search any address, drop pins on the interactive map, and calculate the safest transit path for your accessibility needs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Search & Profiles */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 shadow-xl border border-gray-200 bg-white rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary-600" />
              Where are you going?
            </h2>

            {/* Origin & Destination Inputs */}
            <div className="space-y-4 relative">
              {/* Origin Input */}
              <div ref={originInputRef} className="relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Starting Point (Origin)
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-3 h-3 rounded-full bg-blue-600"></div>
                  <input
                    type="text"
                    value={originQuery}
                    onChange={(e) => handleOriginSearch(e.target.value)}
                    onFocus={() => {
                      setActiveDropdown('origin');
                      if (originSuggestions.length === 0) setOriginSuggestions(POPULAR_HUBS);
                    }}
                    placeholder="Search place, bus stop, landmark..."
                    className="w-full pl-9 pr-10 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    title="Use my current location"
                    className="absolute right-2.5 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {activeDropdown === 'origin' && originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {originSuggestions.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setOriginQuery(place.name);
                          setOriginCoords({ lat: place.lat, lng: place.lng });
                          setActiveDropdown(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 flex items-start gap-2.5 transition"
                      >
                        {place.isStop ? (
                          <Bus className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{place.name}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">{place.displayName}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-2">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-1.5 bg-white border border-gray-300 rounded-full shadow hover:bg-gray-100 text-gray-600 transition"
                  title="Swap Origin & Destination"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* Destination Input */}
              <div ref={destInputRef} className="relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Destination
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 w-3 h-3 rounded-full bg-red-600"></div>
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => handleDestSearch(e.target.value)}
                    onFocus={() => {
                      setActiveDropdown('dest');
                      if (destSuggestions.length === 0) setDestSuggestions(POPULAR_HUBS);
                    }}
                    placeholder="Where to? (e.g. Patia, Airport, Station)"
                    className="w-full pl-9 pr-10 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                  />
                  <div className="absolute right-3 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                </div>

                {/* Suggestions Dropdown */}
                {activeDropdown === 'dest' && destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {destSuggestions.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDestQuery(place.name);
                          setDestCoords({ lat: place.lat, lng: place.lng });
                          setActiveDropdown(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 flex items-start gap-2.5 transition"
                      >
                        {place.isStop ? (
                          <Bus className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{place.name}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">{place.displayName}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Accessibility Profile Selector */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                Select Mobility Persona
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {PROFILES.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProfile(p.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? p.color + ' ring-2 ring-primary-500 font-bold shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className="w-5 h-5" />
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{p.label}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error banner */}
            {searchError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {searchError}
              </div>
            )}

            {/* Find Routes Button */}
            <Button
              size="lg"
              className="w-full mt-6 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-base font-semibold shadow-lg shadow-primary-500/25 transition"
              onClick={handlePlanJourney}
              disabled={isLoading || !originCoords || !destCoords}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Calculating Best Route...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5 mr-2" />
                  Find Best Routes
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Pane: Interactive Map with Pin Dropping */}
        <div className="lg:col-span-7">
          <Card className="p-4 shadow-xl border border-gray-200 bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-bold text-gray-900">
                  Interactive Map — Click anywhere to set pins
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClickMode('origin')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                    clickMode === 'origin'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Set Origin (A)
                </button>
                <button
                  type="button"
                  onClick={() => setClickMode('destination')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                    clickMode === 'destination'
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Set Destination (B)
                </button>
              </div>
            </div>

            <div className="h-[460px] w-full rounded-xl overflow-hidden border border-gray-200 relative">
              <MapContainer
                center={[originCoords.lat || 20.3533, originCoords.lng || 85.8164]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler
                  onSelectPoint={handleMapPointSelected}
                  clickMode={clickMode}
                />

                {/* Origin Marker */}
                {originCoords && (
                  <Marker position={[originCoords.lat, originCoords.lng]} icon={originIcon}>
                    <Popup>
                      <strong>Origin (A)</strong>
                      <br />
                      {originQuery}
                    </Popup>
                  </Marker>
                )}

                {/* Destination Marker */}
                {destCoords && (
                  <Marker position={[destCoords.lat, destCoords.lng]} icon={destIcon}>
                    <Popup>
                      <strong>Destination (B)</strong>
                      <br />
                      {destQuery}
                    </Popup>
                  </Marker>
                )}

                {/* Popular Stops around Bhubaneswar */}
                {POPULAR_HUBS.map((hub, idx) => (
                  <Marker
                    key={idx}
                    position={[hub.lat, hub.lng]}
                    icon={stopIcon}
                    eventHandlers={{
                      click: () => {
                        if (clickMode === 'origin') {
                          setOriginQuery(hub.name);
                          setOriginCoords({ lat: hub.lat, lng: hub.lng });
                          setClickMode('destination');
                        } else {
                          setDestQuery(hub.name);
                          setDestCoords({ lat: hub.lat, lng: hub.lng });
                        }
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>{hub.name}</strong>
                        <div className="text-gray-500 mt-1">{hub.displayName}</div>
                        <div className="mt-2 text-primary-600 font-semibold cursor-pointer">
                          Click marker to select as {clickMode}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
