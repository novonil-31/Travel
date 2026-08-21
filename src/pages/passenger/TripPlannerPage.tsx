import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button } from '../../components/ui';
import { journeysApi, stopsApi } from '../../api';
import {
  Navigation, MapPin, ArrowDownUp, Search, Clock,
  Crosshair, Loader2, Sparkles, AlertCircle, CheckCircle,
  Bus, Car, Shield, Accessibility
} from 'lucide-react';
import type { GeocodedPlace } from '../../utils/onlineRouting';

interface LocationState {
  name: string;
  lat: number;
  lng: number;
}

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
  const { setSearchResults, state, updateProfile } = useAppStore();

  // Location inputs state
  const [originInput, setOriginInput] = useState<string>('Campus Gate');
  const [originLocation, setOriginLocation] = useState<LocationState>({
    name: 'Campus Gate',
    lat: 20.3555,
    lng: 85.8145,
  });

  const [destinationInput, setDestinationInput] = useState<string>('Patia Transit Station');
  const [destinationLocation, setDestinationLocation] = useState<LocationState>({
    name: 'Patia Transit Station',
    lat: 20.3450,
    lng: 85.8180,
  });

  // Autocomplete Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState<GeocodedPlace[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<GeocodedPlace[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | null>(null);

  // Mobility Mode (Simple 3 options like Uber/Google Maps)
  const [selectedMobility, setSelectedMobility] = useState<string>('wheelchair');

  // Loading & GPS state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search for Origin
  useEffect(() => {
    if (!originInput || originInput.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const places = await stopsApi.searchPlaces(originInput);
        setOriginSuggestions(places);
      } catch (err) {
        console.error('Origin search error:', err);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [originInput]);

  // Debounced search for Destination
  useEffect(() => {
    if (!destinationInput || destinationInput.trim().length < 2) {
      setDestinationSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const places = await stopsApi.searchPlaces(destinationInput);
        setDestinationSuggestions(places);
      } catch (err) {
        console.error('Destination search error:', err);
      } finally {
        setIsSearchingDest(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [destinationInput]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrigin = (place: GeocodedPlace) => {
    setOriginInput(place.name);
    setOriginLocation({ name: place.name, lat: place.lat, lng: place.lng });
    setActiveDropdown(null);
  };

  const handleSelectDest = (place: GeocodedPlace) => {
    setDestinationInput(place.name);
    setDestinationLocation({ name: place.name, lat: place.lat, lng: place.lng });
    setActiveDropdown(null);
  };

  // HTML5 GPS Geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
  };

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const rev = await stopsApi.reverseGeocode(lat, lng);
          const locName = typeof rev === 'string' && rev ? rev : ((rev as any)?.name || (rev as any)?.displayName || `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          setOriginInput(locName);
          setOriginLocation({ name: locName, lat, lng });
          setActiveDropdown(null);
        } catch {
          const locName = `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          setOriginInput(locName);
          setOriginLocation({ name: locName, lat, lng });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        const fallbackName = 'Campus Gate (Current GPS)';
        setOriginInput(fallbackName);
        setOriginLocation({ name: fallbackName, lat: 20.3555, lng: 85.8145 });
        setGpsError('GPS permission denied. Using current campus location.');
        setTimeout(() => setGpsError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Swap Locations
  const handleSwap = () => {
    const tempInput = originInput;
    const tempLoc = originLocation;
    setOriginInput(destinationInput);
    setOriginLocation(destinationLocation);
    setDestinationInput(tempInput);
    setDestinationLocation(tempLoc);
  };

  // Quick Preset Selection
  const handleSelectPreset = (from: LocationState, to: LocationState) => {
    setOriginInput(from.name);
    setOriginLocation(from);
    setDestinationInput(to.name);
    setDestinationLocation(to);
    setActiveDropdown(null);
  };

  // Search & Plan Submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlanning(true);

    try {
      let finalOrigin = { ...originLocation };
      let finalDest = { ...destinationLocation };

      if (originInput && originInput !== originLocation.name) {
        const matches = await stopsApi.searchPlaces(originInput);
        if (matches && matches.length > 0) {
          finalOrigin = { name: matches[0].name, lat: matches[0].lat, lng: matches[0].lng };
        }
      }

      if (destinationInput && destinationInput !== destinationLocation.name) {
        const matches = await stopsApi.searchPlaces(destinationInput);
        if (matches && matches.length > 0) {
          finalDest = { name: matches[0].name, lat: matches[0].lat, lng: matches[0].lng };
        }
      }

      const planRes = await journeysApi.plan({
        origin: {
          lat: finalOrigin.lat,
          lng: finalOrigin.lng,
          name: originInput || finalOrigin.name,
        },
        destination: {
          lat: finalDest.lat,
          lng: finalDest.lng,
          name: destinationInput || finalDest.name,
        },
        profileType: selectedMobility === 'wheelchair' ? 'WHEELCHAIR' : selectedMobility === 'elderly' ? 'ELDERLY' : 'GENERAL',
      });

      if (planRes && planRes.options && planRes.options.length > 0) {
        setSearchResults(planRes.options);
      }
    } catch (err) {
      console.error('Journey planning failed', err);
    } finally {
      setIsPlanning(false);
      navigate('/routes');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-6" ref={dropdownRef}>
      {/* Clean Header */}
      <div>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
          Where to?
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Accessible transit routes, live bus stops & closest shared taxi stands.
        </p>
      </div>

      {gpsError && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Main Search Form Card (Uber / Google Maps style) */}
      <div className="bg-white border border-neutral-200 p-5 sm:p-6 rounded-3xl shadow-uber-elevated space-y-5">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Pickup & Destination Box */}
          <div className="bg-neutral-50 p-2 rounded-2xl border border-neutral-200 relative space-y-1">
            {/* Origin Input */}
            <div className="relative flex items-center bg-white rounded-xl border border-neutral-200/80 px-3 py-2.5 shadow-2xs">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0 mr-3 ring-4 ring-emerald-100" />
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                onFocus={() => setActiveDropdown('origin')}
                placeholder="Enter pickup location..."
                className="w-full bg-transparent text-sm font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                title="Use current location"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors ml-1 shrink-0"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4 text-emerald-700" />}
              </button>
            </div>

            {/* Origin Suggestions Dropdown */}
            {activeDropdown === 'origin' && originSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-14 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                {originSuggestions.map((place, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectOrigin(place)}
                    className="p-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold text-neutral-900 block truncate">{place.name}</span>
                      <span className="text-[10px] text-neutral-500 block truncate">{place.displayName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Swap Floating Button */}
            <div className="flex justify-end pr-3 -my-2 relative z-10">
              <button
                type="button"
                onClick={handleSwap}
                className="w-7 h-7 rounded-full bg-white border border-neutral-300 shadow-sm flex items-center justify-center text-neutral-700 hover:text-black hover:bg-neutral-50 transition-all"
                title="Swap pickup & destination"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Destination Input */}
            <div className="relative flex items-center bg-white rounded-xl border border-neutral-200/80 px-3 py-2.5 shadow-2xs">
              <span className="w-3 h-3 rounded-xs bg-red-600 shrink-0 mr-3 ring-4 ring-red-100" />
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onFocus={() => setActiveDropdown('dest')}
                placeholder="Where to? (Enter destination)"
                className="w-full bg-transparent text-sm font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            {/* Destination Suggestions Dropdown */}
            {activeDropdown === 'dest' && destinationSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-28 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                {destinationSuggestions.map((place, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectDest(place)}
                    className="p-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold text-neutral-900 block truncate">{place.name}</span>
                      <span className="text-[10px] text-neutral-500 block truncate">{place.displayName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick 1-Tap Popular Locations */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Quick Shortcuts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Campus Gate → Patia', from: { name: 'Campus Gate', lat: 20.3555, lng: 85.8145 }, to: { name: 'Patia Station', lat: 20.3450, lng: 85.8180 } },
                { label: 'Hospital → Jaydev Vihar', from: { name: 'Hospital', lat: 20.3570, lng: 85.8170 }, to: { name: 'Jaydev Vihar', lat: 20.3050, lng: 85.8200 } },
                { label: 'Infocity → Railway Station', from: { name: 'Infocity', lat: 20.3600, lng: 85.8120 }, to: { name: 'Railway Station', lat: 20.2666, lng: 85.8436 } },
              ].map((p, idx) => (
                <button
                  type="button"
                  onClick={() => handleSelectPreset(p.from, p.to)}
                  className="px-3 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800 transition-all"
                >
                  {p.label}
                </button>
              </div>

          {/* Simple Mobility Choice (Uber Style 3 Pills) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Accessibility Mode:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'wheelchair', label: '♿ Wheelchair', sub: 'Ramps & 0 Stairs' },
                { id: 'elderly', label: '🧓 Senior Citizen', sub: 'Minimal Walk' },
                { id: 'none', label: '🚶 Standard', sub: 'Fastest Transit' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMobility(m.id);
                    updateProfile({ mobility: m.id as any });
                  }}
                  className={`p-2.5 rounded-2xl text-center border transition-all ${
                    selectedMobility === m.id
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-xs font-bold block">{m.label}</span>
                  <span className={`text-[10px] block ${selectedMobility === m.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {m.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Minimal 1-Line Stand & Price Preview */}
          {originInput && (
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900">🚏 Public Bus: ~₹15-20</span>
                <span className="text-neutral-300">•</span>
                <span className="font-bold text-neutral-700">🚖 Shared Auto: ~₹25-40</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                Live Estimates
              </span>
            </div>
          )}

          {/* Big Clean Black Search Button (Like Uber/Ola) */}
          <Button
            type="submit"
            size="lg"
            className="w-full text-base py-4 font-black shadow-md rounded-2xl bg-black hover:bg-neutral-800 text-white"
            loading={isPlanning}
          >
            <Search className="w-4 h-4 mr-2" /> See Routes & Fares
          </Button>
        </form>
      </div>
    </div>
  );
}
