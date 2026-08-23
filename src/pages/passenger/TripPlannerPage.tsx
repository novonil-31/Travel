import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSearchResults, state, updateProfile } = useAppStore();

  const urlOrigin = searchParams.get('origin');
  const urlDest = searchParams.get('destination');
  const urlMobility = searchParams.get('mobility');
  const urlOriginLat = searchParams.get('originLat') ? parseFloat(searchParams.get('originLat')!) : null;
  const urlOriginLng = searchParams.get('originLng') ? parseFloat(searchParams.get('originLng')!) : null;
  const urlDestLat = searchParams.get('destLat') ? parseFloat(searchParams.get('destLat')!) : null;
  const urlDestLng = searchParams.get('destLng') ? parseFloat(searchParams.get('destLng')!) : null;

  // Location inputs state (Default: QC 1 to Campus 3 OAT)
  const [originInput, setOriginInput] = useState<string>(urlOrigin || "Queen's Castle 1 (QC 1)");
  const [originLocation, setOriginLocation] = useState<LocationState>({
    name: urlOrigin || "Queen's Castle 1 (QC 1)",
    lat: urlOriginLat ?? 20.352367250329067,
    lng: urlOriginLng ?? 85.81937388473358,
  });

  const [destinationInput, setDestinationInput] = useState<string>(urlDest || 'Campus 3 OAT');
  const [destinationLocation, setDestinationLocation] = useState<LocationState>({
    name: urlDest || 'Campus 3 OAT',
    lat: urlDestLat ?? 20.352708891788033,
    lng: urlDestLng ?? 85.81637927996144,
  });

  // Autocomplete Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState<GeocodedPlace[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<GeocodedPlace[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | null>(null);

  const urlTimeMode = searchParams.get('timeMode') || 'now';
  const urlDepartTime = searchParams.get('departTime') || '09:30';

  // Mobility Mode (Simple 3 options like Uber/Google Maps)
  const [selectedMobility, setSelectedMobility] = useState<string>(
    urlMobility && urlMobility !== 'all' ? urlMobility : 'standard'
  );
  const [timeMode, setTimeMode] = useState<string>(urlTimeMode);
  const [departTime, setDepartTime] = useState<string>(urlDepartTime);

  // Loading & GPS state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoPlannedRef = useRef<boolean>(false);

  // Auto-plan if navigated from hero/auth with explicit query params
  useEffect(() => {
    if (urlOrigin && urlDest && !autoPlannedRef.current) {
      autoPlannedRef.current = true;
      executePlanning(urlOrigin, urlDest, urlMobility || 'standard');
    }
  }, [urlOrigin, urlDest, urlMobility]);

  // Immediate & debounced search for Origin (Loads instant KIIT recommendations on focus or typing)
  useEffect(() => {
    const query = originInput?.trim() || '';
    const timeout = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const places = await stopsApi.searchPlaces(query);
        setOriginSuggestions(places);
      } catch (err) {
        console.error('Origin search error:', err);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, query.length === 0 ? 0 : 100);
    return () => clearTimeout(timeout);
  }, [originInput]);

  // Immediate & debounced search for Destination (Loads instant KIIT recommendations on focus or typing)
  useEffect(() => {
    const query = destinationInput?.trim() || '';
    const timeout = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const places = await stopsApi.searchPlaces(query);
        setDestinationSuggestions(places);
      } catch (err) {
        console.error('Destination search error:', err);
      } finally {
        setIsSearchingDest(false);
      }
    }, query.length === 0 ? 0 : 100);
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

  // Execute Dynamic Planning
  const executePlanning = async (origText: string, destText: string, mobility: string) => {
    setIsPlanning(true);

    try {
      let finalOrigin = { ...originLocation };
      let finalDest = { ...destinationLocation };

      if (origText && origText !== originLocation.name) {
        const matches = await stopsApi.searchPlaces(origText);
        if (matches && matches.length > 0) {
          finalOrigin = { name: matches[0].name, lat: matches[0].lat, lng: matches[0].lng };
        }
      }

      if (destText && destText !== destinationLocation.name) {
        const matches = await stopsApi.searchPlaces(destText);
        if (matches && matches.length > 0) {
          finalDest = { name: matches[0].name, lat: matches[0].lat, lng: matches[0].lng };
        }
      }

      let finalDepartureTime = new Date();
      if (timeMode !== 'now' && departTime) {
        const [hh, mm] = departTime.split(':').map(Number);
        finalDepartureTime.setHours(hh || 9, mm || 30, 0, 0);
      }

      const planRes = await journeysApi.plan({
        origin: {
          lat: finalOrigin.lat,
          lng: finalOrigin.lng,
          name: origText || finalOrigin.name,
        },
        destination: {
          lat: finalDest.lat,
          lng: finalDest.lng,
          name: destText || finalDest.name,
        },
        profileType: mobility === 'wheelchair' ? 'WHEELCHAIR' : mobility === 'elderly' ? 'ELDERLY' : 'GENERAL',
        departureTime: finalDepartureTime.toISOString(),
      } as any);

      if (planRes && planRes.options && planRes.options.length > 0) {
        setSearchResults(planRes.options);
      }
    } catch (err) {
      console.error('Journey planning failed', err);
    } finally {
      setIsPlanning(false);
      navigate(`/routes?timeMode=${timeMode}&departTime=${encodeURIComponent(departTime)}`);
    }
  };

  // Search & Plan Submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await executePlanning(originInput, destinationInput, selectedMobility);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Clean Header */}
      <div>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
          Where to?
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Plan real-time accessible bus lines, shared auto stands & step-free paths.
        </p>
      </div>

      {/* Main Search Card (Uber / Ola Style) */}
      <div ref={dropdownRef} className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4 relative">
        <form onSubmit={handleSearch} className="space-y-3">
          {/* Pickup Input Row */}
          <div className="relative">
            <div className="flex items-center gap-3">
              {/* Green A Icon */}
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black text-xs shrink-0">
                A
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={originInput}
                  onFocus={() => setActiveDropdown('origin')}
                  onChange={(e) => {
                    setOriginInput(e.target.value);
                    setActiveDropdown('origin');
                  }}
                  placeholder="Enter pickup stop, campus or address..."
                  className="w-full pl-3 pr-10 py-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 focus:bg-white border border-neutral-200 focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                  required
                />

                {/* 1-Click GPS Button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  title="Use current GPS location"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl hover:bg-neutral-200 text-neutral-600 hover:text-black transition-colors"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <Crosshair className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Origin Autocomplete Dropdown */}
            {activeDropdown === 'origin' && originSuggestions.length > 0 && (
              <div className="absolute left-11 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y divide-neutral-100">
                {originSuggestions.map((place, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOrigin(place)}
                    className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-start gap-3 transition-colors text-xs font-semibold"
                  >
                    <div className="text-base shrink-0 mt-0.5">
                      {place.displayName.startsWith('👑') ? '👑' :
                       place.displayName.startsWith('👸') ? '👸' :
                       place.displayName.startsWith('🎓') ? '🎓' :
                       place.displayName.startsWith('📚') ? '📚' :
                       place.displayName.startsWith('✈️') ? '✈️' :
                       place.displayName.startsWith('🚆') ? '🚆' :
                       <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-900 font-bold flex items-center gap-1.5 truncate">
                        <span>{place.name}</span>
                        {place.type === 'kp_hostel' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black">KP</span>
                        )}
                        {place.type === 'qc_hostel' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-800 font-black">QC</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 line-clamp-1">{place.displayName || 'KIIT / Bhubaneswar Corridor'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button Divider */}
          <div className="flex items-center justify-between pl-4 pr-1 py-0.5">
            <div className="h-6 border-l-2 border-dashed border-neutral-300 ml-0.5" />
            <button
              type="button"
              onClick={handleSwap}
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              title="Swap pickup & destination"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Input Row */}
          <div className="relative">
            <div className="flex items-center gap-3">
              {/* Red B Icon */}
              <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-800 font-black text-xs shrink-0">
                B
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={destinationInput}
                  onFocus={() => setActiveDropdown('dest')}
                  onChange={(e) => {
                    setDestinationInput(e.target.value);
                    setActiveDropdown('dest');
                  }}
                  placeholder="Where to? (e.g. KP 7, QC 5, Campus 15, Station)..."
                  className="w-full pl-3 pr-4 py-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 focus:bg-white border border-neutral-200 focus:border-black text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Destination Autocomplete Dropdown */}
            {activeDropdown === 'dest' && destinationSuggestions.length > 0 && (
              <div className="absolute left-11 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y divide-neutral-100">
                {destinationSuggestions.map((place, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDest(place)}
                    className="w-full px-4 py-3 text-left hover:bg-neutral-50 flex items-start gap-3 transition-colors text-xs font-semibold"
                  >
                    <div className="text-base shrink-0 mt-0.5">
                      {place.displayName.startsWith('👑') ? '👑' :
                       place.displayName.startsWith('👸') ? '👸' :
                       place.displayName.startsWith('🎓') ? '🎓' :
                       place.displayName.startsWith('📚') ? '📚' :
                       place.displayName.startsWith('✈️') ? '✈️' :
                       place.displayName.startsWith('🚆') ? '🚆' :
                       <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-900 font-bold flex items-center gap-1.5 truncate">
                        <span>{place.name}</span>
                        {place.type === 'kp_hostel' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black">KP</span>
                        )}
                        {place.type === 'qc_hostel' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-800 font-black">QC</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 line-clamp-1">{place.displayName || 'KIIT / Bhubaneswar Corridor'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Error alert */}
          {gpsError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Mobility Mode Options */}
          <div className="pt-2 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
              Mobility Priority
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'standard', label: '🚶 Standard', desc: 'Fastest Route' },
                { id: 'wheelchair', label: '♿ Wheelchair', desc: 'Ramps & 0 Stairs' },
                { id: 'elderly', label: '🧓 Senior', desc: 'Minimal Walk' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMobility(m.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all ${
                    selectedMobility === m.id
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className={`text-[10px] mt-0.5 ${selectedMobility === m.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule & Time Selector */}
          <div className="pt-2 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
              Departure Schedule
            </span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={timeMode}
                onChange={(e) => setTimeMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-100 border border-transparent focus:border-black text-xs font-semibold text-neutral-900 focus:outline-none cursor-pointer"
              >
                <option value="now">⚡ Leave Now</option>
                <option value="depart">⏰ Depart at...</option>
                <option value="arrive">🏁 Arrive by...</option>
              </select>

              {timeMode !== 'now' ? (
                <input
                  type="time"
                  value={departTime}
                  onChange={(e) => setDepartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 focus:border-black font-bold text-xs text-neutral-900 focus:outline-none"
                />
              ) : (
                <div className="px-3 py-2.5 rounded-xl bg-neutral-50 text-neutral-400 text-xs font-medium text-center">
                  Live departures
                </div>
              )}
            </div>
          </div>

          {/* Submit Search CTA (Ola / Uber Style) */}
          <button
            type="submit"
            disabled={isPlanning}
            className="w-full mt-3 py-4 rounded-2xl bg-black hover:bg-neutral-800 text-white font-bold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isPlanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Finding Accessible Routes & Fares...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>See Routes & Fares</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Popular Corridors Shortcuts */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
          Frequent Verified Transit Corridors
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              from: { name: 'Queen\'s Castle 1 (QC-1)', lat: 20.352367, lng: 85.819374 },
              to: { name: 'KIIT Campus 3 OAT (Open Air Theatre)', lat: 20.352709, lng: 85.816379 },
              tag: '⚡ KIIT Eco EV Shuttle • Free (Via C17 & C15A)',
            },
            {
              from: { name: 'King\'s Palace 7 (KP-7, Campus 12)', lat: 20.3567, lng: 85.8160 },
              to: { name: 'KIIT Campus 15 (School of Computer Engineering)', lat: 20.3529, lng: 85.8242 },
              tag: 'Hostel to CSE Lab Corridor • 4 min',
            },
            {
              from: { name: 'Queen\'s Castle 5 (QC-5 / Campus 17)', lat: 20.349176, lng: 85.819399 },
              to: { name: 'KIIT Campus 3 OAT (Open Air Theatre)', lat: 20.352709, lng: 85.816379 },
              tag: '⚡ EV Shuttle Boarding Stop • Free',
            },
            {
              from: { name: 'KIIT Campus 3 (Main Auditorium)', lat: 20.3508, lng: 85.8190 },
              to: { name: 'Master Canteen Central Railway Station (BBS)', lat: 20.2666, lng: 85.8436 },
              tag: 'Campus to Superfast Train Line • ₹30',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(item.from, item.to)}
              className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-black text-left transition-all shadow-sm group flex flex-col justify-between"
            >
              <div className="font-bold text-xs text-neutral-900 group-hover:text-black">
                {item.from.name} → {item.to.name}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">{item.tag}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
