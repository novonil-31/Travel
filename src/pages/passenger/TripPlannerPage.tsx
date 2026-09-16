import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Button } from '../../components/ui';
import { journeysApi, stopsApi } from '../../api';
import {
  Navigation, MapPin, ArrowDownUp, Search, Clock,
  Crosshair, Loader2, Sparkles, AlertCircle, CheckCircle,
  Bus, Car, Shield, Accessibility, History, ArrowRight, Compass
} from 'lucide-react';
import { type GeocodedPlace, getRegionalDefaultRecommendations, clearSearchPlacesCache } from '../../utils/onlineRouting';
import { getLastSearchedDestination, getRecentSearches, saveRecentSearch } from '../../utils/recentSearches';
import { isLoggedInAccount } from '../../utils/authUtils';
import { useUserLocation } from '../../hooks/useUserLocation';
import { LocationRegionBanner } from '../../components/LocationRegionBanner';
import { SavedPlacesBar } from '../../components/SavedPlacesBar';

interface LocationState {
  name: string;
  lat: number;
  lng: number;
}

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSearchResults, state, updateProfile } = useAppStore();
  const { userLocation, requestLocation, setManualCity } = useUserLocation();

  const isAuth = isLoggedInAccount(state.currentUser);

  const urlOrigin = searchParams.get('origin');
  const urlDest = searchParams.get('destination') || searchParams.get('to');
  const urlMobility = searchParams.get('mobility');
  const urlOriginLat = searchParams.get('originLat') ? parseFloat(searchParams.get('originLat')!) : null;
  const urlOriginLng = searchParams.get('originLng') ? parseFloat(searchParams.get('originLng')!) : null;
  const urlDestLat = searchParams.get('destLat') ? parseFloat(searchParams.get('destLat')!) : null;
  const urlDestLng = searchParams.get('destLng') ? parseFloat(searchParams.get('destLng')!) : null;

  // Retrieve last searched destination for all commuters (guest or logged-in)
  const currentUserId = state.currentUser?.id || 'guest';
  const lastSavedSearch = getLastSearchedDestination(currentUserId);
  const userRecentSearches = getRecentSearches(currentUserId);

  const getCityDefaults = () => {
    if (userLocation.regionKey === 'delhi_ncr') {
      return {
        orig: userLocation.placeName || 'Connaught Place, New Delhi',
        origLat: 28.6315,
        origLng: 77.2167,
        dest: 'Indira Gandhi International Airport (DEL)',
        destLat: 28.5562,
        destLng: 77.1000,
      };
    }
    if (userLocation.regionKey === 'mumbai') {
      return {
        orig: userLocation.placeName || 'Marine Drive, Mumbai',
        origLat: 18.9438,
        origLng: 72.8232,
        dest: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
        destLat: 18.9400,
        destLng: 72.8354,
      };
    }
    if (userLocation.regionKey === 'bengaluru') {
      return {
        orig: userLocation.placeName || 'Indiranagar, Bengaluru',
        origLat: 12.9784,
        origLng: 77.6408,
        dest: 'Kempegowda International Airport (BLR)',
        destLat: 13.1986,
        destLng: 77.7066,
      };
    }
    if (userLocation.regionKey === 'bhubaneswar_kiit') {
      return {
        orig: "Queen's Castle 1 (QC 1)",
        origLat: 20.352367250329067,
        origLng: 85.81937388473358,
        dest: 'Campus 3 OAT',
        destLat: 20.352708891788033,
        destLng: 85.81637927996144,
      };
    }
    return {
      orig: userLocation.placeName || `${userLocation.cityName} Central`,
      origLat: userLocation.lat,
      origLng: userLocation.lng,
      dest: `${userLocation.cityName} Railway Station`,
      destLat: userLocation.lat + 0.02,
      destLng: userLocation.lng + 0.02,
    };
  };

  const cityDefaults = getCityDefaults();

  // Location inputs state
  const initialOriginName = urlOrigin || (lastSavedSearch?.origin?.name ? lastSavedSearch.origin.name : cityDefaults.orig);
  const initialOriginLat = urlOriginLat ?? (lastSavedSearch?.origin?.lat ? lastSavedSearch.origin.lat : cityDefaults.origLat);
  const initialOriginLng = urlOriginLng ?? (lastSavedSearch?.origin?.lng ? lastSavedSearch.origin.lng : cityDefaults.origLng);

  const initialDestName = urlDest || (isAuth && lastSavedSearch?.destination?.name ? lastSavedSearch.destination.name : cityDefaults.dest);
  const initialDestLat = urlDestLat ?? (isAuth && lastSavedSearch?.destination?.lat ? lastSavedSearch.destination.lat : cityDefaults.destLat);
  const initialDestLng = urlDestLng ?? (isAuth && lastSavedSearch?.destination?.lng ? lastSavedSearch.destination.lng : cityDefaults.destLng);

  const [originInput, setOriginInput] = useState<string>(initialOriginName);
  const [originLocation, setOriginLocation] = useState<LocationState>({
    name: initialOriginName,
    lat: initialOriginLat,
    lng: initialOriginLng,
  });

  const [destinationInput, setDestinationInput] = useState<string>(initialDestName);
  const [destinationLocation, setDestinationLocation] = useState<LocationState>({
    name: initialDestName,
    lat: initialDestLat,
    lng: initialDestLng,
  });

  // Re-sync when user switches city if not given explicit URL params
  useEffect(() => {
    if (!urlOrigin && !urlDest) {
      const updated = getCityDefaults();
      setOriginInput(updated.orig);
      setOriginLocation({ name: updated.orig, lat: updated.origLat, lng: updated.origLng });
      if (!lastSavedSearch?.destination?.name) {
        setDestinationInput(updated.dest);
        setDestinationLocation({ name: updated.dest, lat: updated.destLat, lng: updated.destLng });
      }
    }
  }, [userLocation.regionKey, userLocation.cityName]);

  // Autocomplete Suggestions State
  const [originSuggestions, setOriginSuggestions] = useState<GeocodedPlace[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<GeocodedPlace[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'dest' | null>(null);

  const urlTimeMode = searchParams.get('timeMode') || 'now';
  const urlDepartTime = searchParams.get('departTime') || '';
  const urlDepartDate = searchParams.get('date') || searchParams.get('departDate') || '';

  // Mobility Mode (Simple 3 options like Uber/Google Maps)
  const [selectedMobility, setSelectedMobility] = useState<string>(
    urlMobility && urlMobility !== 'all' ? urlMobility : 'standard'
  );
  const [timeMode, setTimeMode] = useState<string>(urlTimeMode);
  const [departTime, setDepartTime] = useState<string>(urlDepartTime);
  const [departDate, setDepartDate] = useState<string>(
    urlDepartDate || new Date().toISOString().split('T')[0]
  );

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

  // Immediate & debounced search for Origin (Loads instant regional recommendations based on active user location)
  useEffect(() => {
    const query = originInput?.trim() || '';
    const timeout = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const places = await stopsApi.searchPlaces(query, userLocation);
        setOriginSuggestions(places);
      } catch (err) {
        console.error('Origin search error:', err);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, query.length === 0 ? 0 : 100);
    return () => clearTimeout(timeout);
  }, [originInput, userLocation]);

  // Immediate & debounced search for Destination (Loads instant regional recommendations based on active user location)
  useEffect(() => {
    const query = destinationInput?.trim() || '';
    const timeout = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const places = await stopsApi.searchPlaces(query, userLocation);
        setDestinationSuggestions(places);
      } catch (err) {
        console.error('Destination search error:', err);
      } finally {
        setIsSearchingDest(false);
      }
    }, query.length === 0 ? 0 : 100);
    return () => clearTimeout(timeout);
  }, [destinationInput, userLocation]);

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
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setGpsError(null);

    try {
      const loc = await requestLocation();
      const finalLoc = loc || userLocation;
      if (finalLoc && finalLoc.lat && finalLoc.lng) {
        const placeTitle = finalLoc.placeName || `${finalLoc.cityName} (Current Location)`;
        setOriginInput(placeTitle);
        setOriginLocation({
          name: placeTitle,
          lat: finalLoc.lat,
          lng: finalLoc.lng,
        });
        setActiveDropdown(null);
      } else {
        const fallbackName = userLocation.placeName || `${userLocation.cityName} (Current Location)`;
        setOriginInput(fallbackName);
        setOriginLocation({ name: fallbackName, lat: userLocation.lat, lng: userLocation.lng });
      }
    } catch {
      const fallbackName = userLocation.placeName || `${userLocation.cityName} (Current Location)`;
      setOriginInput(fallbackName);
      setOriginLocation({ name: fallbackName, lat: userLocation.lat, lng: userLocation.lng });
    } finally {
      setIsLocating(false);
    }
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

  // Quick Preset Selection (Immediately executes search & planning)
  const handleSelectPreset = async (from: LocationState, to: LocationState) => {
    setOriginInput(from.name);
    setOriginLocation(from);
    setDestinationInput(to.name);
    setDestinationLocation(to);
    setActiveDropdown(null);
    await executePlanning(from.name, to.name, selectedMobility, from, to);
  };

  // Execute Dynamic Planning
  const executePlanning = async (
    origText: string,
    destText: string,
    mobility: string,
    overrideOrigin?: LocationState,
    overrideDest?: LocationState
  ) => {
    setIsPlanning(true);

    try {
      let finalOrigin = overrideOrigin ? { ...overrideOrigin } : { ...originLocation };
      let finalDest = overrideDest ? { ...overrideDest } : { ...destinationLocation };

      if (!overrideOrigin && origText && origText !== originLocation.name) {
        const matches = await stopsApi.searchPlaces(origText, userLocation);
        if (matches && matches.length > 0) {
          finalOrigin = { name: matches[0].name, lat: matches[0].lat, lng: matches[0].lng };
        }
      }

      if (!overrideDest && destText && destText !== destinationLocation.name) {
        const matches = await stopsApi.searchPlaces(destText, userLocation);
        if (matches && matches.length > 0) {
          finalDest = { name: matches[0].name, lat: matches[0].lat, lng: matches[0].lng };
        }
      }

      // Save recent search for all users
      saveRecentSearch(state.currentUser?.id, finalOrigin, finalDest);

      let finalDepartureTime = new Date();
      if (departDate) {
        const [y, m, d] = departDate.split('-').map(Number);
        if (y && m && d) {
          finalDepartureTime.setFullYear(y, m - 1, d);
        }
      }
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

      const timeParam = timeMode !== 'now' && departTime ? `&departTime=${encodeURIComponent(departTime)}` : '';
      const dateParam = departDate ? `&date=${encodeURIComponent(departDate)}` : '';
      navigate(
        `/routes?origin=${encodeURIComponent(finalOrigin.name)}&destination=${encodeURIComponent(finalDest.name)}&originLat=${finalOrigin.lat}&originLng=${finalOrigin.lng}&destLat=${finalDest.lat}&destLng=${finalDest.lng}&mobility=${mobility}&timeMode=${timeMode}${timeParam}${dateParam}`
      );
    } catch (err) {
      console.error('Journey planning failed', err);
    } finally {
      setIsPlanning(false);
    }
  };

  // Search & Plan Submit
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await executePlanning(originInput, destinationInput, selectedMobility);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-6 font-sans">
      {/* Clean Header with City Switcher */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight truncate">
            Where to?
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 truncate">
            Find accessible, fast and multimodal routes
          </p>
        </div>
        <div className="shrink-0">
          <LocationRegionBanner
            compact
            onLocationChanged={() => {
              clearSearchPlacesCache();
              const recs = getRegionalDefaultRecommendations(userLocation);
              if (recs && recs.length >= 2) {
                setOriginInput(recs[0].name);
                setOriginLocation({ name: recs[0].name, lat: recs[0].lat, lng: recs[0].lng });
                setDestinationInput(recs[1].name);
                setDestinationLocation({ name: recs[1].name, lat: recs[1].lat, lng: recs[1].lng });
              }
            }}
          />
        </div>
      </div>

      {/* Active Navigation Card (If trip active) */}
      {state.activeJourney && (
        <div className="bg-black text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-800 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] uppercase font-black text-neutral-400 tracking-wider">
                  Active Ride
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-neutral-900 text-emerald-400 border border-neutral-800">
                  Live
                </span>
              </div>
              <span className="text-xs sm:text-base font-black text-white block truncate">
                {state.activeJourney.routeName} → {state.activeJourney.destinationName}
              </span>
            </div>
          </div>
          <Link to={`/journey/${state.activeJourney.id}`} className="shrink-0">
            <button
              type="button"
              className="px-3 py-2 bg-white hover:bg-neutral-100 text-black font-black rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <span>Resume</span>
              <ArrowRight className="w-3 h-3 text-black" />
            </button>
          </Link>
        </div>
      )}

      {/* Saved Places Fast 1-Tap Bar (Home / Work) & Commuter Pass */}
      <SavedPlacesBar
        onSelectPlace={(place) => {
          setDestinationInput(place.address);
          setDestinationLocation({ name: place.address, lat: place.lat, lng: place.lng });
        }}
      />

      {/* Main Search Card (Uber / Google Maps Transit Style) */}
      <div ref={dropdownRef} className="bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3.5 relative">
        <form onSubmit={handleSearch} className="space-y-3">
          {/* Pickup Input Row */}
          <div className="relative">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Green Pickup Dot Indicator */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-black text-[11px] sm:text-xs shrink-0 shadow-xs">
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
                  placeholder="Enter pickup stop or address..."
                  className="w-full pl-3 pr-16 py-3 rounded-xl sm:rounded-2xl bg-neutral-50 hover:bg-neutral-100 focus:bg-white border border-neutral-200 focus:border-black text-xs sm:text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                  required
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {originInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setOriginInput('');
                        setActiveDropdown('origin');
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md"
                      title="Clear origin"
                    >
                      ✕
                    </button>
                  )}
                  {/* 1-Click GPS Button */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    title="Use current GPS location"
                    className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 hover:text-black transition-colors"
                  >
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    ) : (
                      <Crosshair className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Origin Autocomplete Dropdown */}
            {activeDropdown === 'origin' && originSuggestions.length > 0 && (
              <div className="absolute left-9 sm:left-11 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto divide-y divide-neutral-100">
                <div className="px-3.5 py-1.5 bg-neutral-50 text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center justify-between border-b border-neutral-100">
                  <span className="truncate max-w-[200px]">Priority near {userLocation.placeName || userLocation.cityName}</span>
                  {userLocation.permissionGranted ? (
                    <span className="text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded text-[9px]">📍 GPS Active</span>
                  ) : (
                    <span className="text-neutral-400 font-normal">Live Search</span>
                  )}
                </div>
                {originSuggestions.map((place, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOrigin(place)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-neutral-50 flex items-start gap-2.5 transition-colors text-xs font-semibold"
                  >
                    <div className="text-sm shrink-0 mt-0.5">
                      {place.displayName.startsWith('🎬') ? '🎬' :
                       place.displayName.startsWith('🛒') ? '🛒' :
                       place.displayName.startsWith('🛍️') ? '🛍️' :
                       place.displayName.startsWith('☕') ? '☕' :
                       place.displayName.startsWith('🍔') ? '🍔' :
                       place.displayName.startsWith('🍕') ? '🍕' :
                       place.displayName.startsWith('💊') ? '💊' :
                       place.displayName.startsWith('🏥') ? '🏥' :
                       place.displayName.startsWith('🏦') ? '🏦' :
                       place.displayName.startsWith('🏋️') ? '🏋️' :
                       place.displayName.startsWith('🚏') ? '🚏' :
                       place.displayName.startsWith('👑') ? '👑' :
                       place.displayName.startsWith('👸') ? '👸' :
                       place.displayName.startsWith('🎓') ? '🎓' :
                       place.displayName.startsWith('📚') ? '📚' :
                       place.displayName.startsWith('✈️') ? '✈️' :
                       place.displayName.startsWith('🚆') ? '🚆' :
                       place.displayName.startsWith('🛕') ? '🛕' :
                       place.displayName.startsWith('🏛️') ? '🏛️' :
                       <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-900 font-bold flex items-center gap-1.5 truncate">
                        <span>{place.name}</span>
                        {place.distanceLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-auto shrink-0 bg-neutral-100 text-neutral-700">
                            {place.distanceLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 line-clamp-1">{place.displayName || `${userLocation.cityName} Region`}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button Divider */}
          <div className="flex items-center justify-between pl-3.5 pr-1 py-0">
            <div className="h-5 border-l-2 border-dashed border-neutral-300 ml-0" />
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              title="Swap pickup & destination"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination Input Row */}
          <div className="relative">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Red Destination B Indicator */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-800 font-black text-[11px] sm:text-xs shrink-0 shadow-xs">
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
                  placeholder="Where to? (e.g. Station, Campus, Airport)..."
                  className="w-full pl-3 pr-10 py-3 rounded-xl sm:rounded-2xl bg-neutral-50 hover:bg-neutral-100 focus:bg-white border border-neutral-200 focus:border-black text-xs sm:text-sm font-bold text-neutral-900 focus:outline-none transition-all"
                  required
                />

                {destinationInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setDestinationInput('');
                      setActiveDropdown('dest');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 rounded-md"
                    title="Clear destination"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Destination Autocomplete Dropdown */}
            {activeDropdown === 'dest' && (
              <div className="absolute left-9 sm:left-11 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto divide-y divide-neutral-100">
                {/* Recent Searches for Logged-In User */}
                {isAuth && userRecentSearches.length > 0 && destinationInput.trim().length === 0 && (
                  <div className="bg-neutral-50/80">
                    <div className="px-3.5 py-1 text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1 border-b border-neutral-100">
                      <Clock className="w-3 h-3" />
                      <span>Recent Destinations</span>
                    </div>
                    {userRecentSearches.slice(0, 3).map((rec, rIdx) => (
                      <button
                        key={`rec-${rIdx}`}
                        type="button"
                        onClick={() => {
                          setDestinationInput(rec.destination.name);
                          setDestinationLocation(rec.destination);
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-neutral-100/80 flex items-center gap-2 transition-colors text-xs border-b border-neutral-100/60"
                      >
                        <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                        <div className="truncate flex-1">
                          <div className="font-bold text-neutral-900 text-xs truncate">{rec.destination.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="px-3.5 py-1 bg-neutral-50 text-[10px] font-black text-neutral-500 uppercase tracking-wider flex items-center justify-between border-b border-neutral-100">
                  <span className="truncate max-w-[200px]">Priority near {userLocation.placeName || userLocation.cityName}</span>
                  {userLocation.permissionGranted ? (
                    <span className="text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded text-[9px]">📍 GPS Active</span>
                  ) : (
                    <span className="text-neutral-400 font-normal">Live Search</span>
                  )}
                </div>

                {destinationSuggestions.map((place, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDest(place)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-neutral-50 flex items-start gap-2.5 transition-colors text-xs font-semibold"
                  >
                    <div className="text-sm shrink-0 mt-0.5">
                      {place.displayName.startsWith('🎬') ? '🎬' :
                       place.displayName.startsWith('🛒') ? '🛒' :
                       place.displayName.startsWith('🛍️') ? '🛍️' :
                       place.displayName.startsWith('☕') ? '☕' :
                       place.displayName.startsWith('🍔') ? '🍔' :
                       place.displayName.startsWith('🍕') ? '🍕' :
                       place.displayName.startsWith('💊') ? '💊' :
                       place.displayName.startsWith('🏥') ? '🏥' :
                       place.displayName.startsWith('🏦') ? '🏦' :
                       place.displayName.startsWith('🏋️') ? '🏋️' :
                       place.displayName.startsWith('🚏') ? '🚏' :
                       place.displayName.startsWith('👑') ? '👑' :
                       place.displayName.startsWith('👸') ? '👸' :
                       place.displayName.startsWith('🎓') ? '🎓' :
                       place.displayName.startsWith('📚') ? '📚' :
                       place.displayName.startsWith('✈️') ? '✈️' :
                       place.displayName.startsWith('🚆') ? '🚆' :
                       place.displayName.startsWith('🛕') ? '🛕' :
                       place.displayName.startsWith('🏛️') ? '🏛️' :
                       <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-900 font-bold flex items-center gap-1.5 truncate">
                        <span>{place.name}</span>
                        {place.distanceLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-auto shrink-0 bg-neutral-100 text-neutral-700">
                            {place.distanceLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 line-clamp-1">{place.displayName || `${userLocation.cityName} Region`}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Error alert */}
          {gpsError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Quick Hubs Chips (Scrollable 1-row) */}
          <div className="pt-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              {[
                { label: '✈️ Airport', query: `${userLocation.cityName} Airport` },
                { label: '🚆 Station', query: `${userLocation.cityName} Railway Station` },
                { label: '🚇 Metro', query: `${userLocation.cityName} Metro` },
                { label: '🚏 Bus Stand', query: `${userLocation.cityName} Bus Stand` },
                { label: '🏥 Hospital', query: `${userLocation.cityName} Hospital` },
              ].map((chip) => (
                <button
                  key={chip.query}
                  type="button"
                  onClick={() => {
                    setDestinationInput(chip.query);
                    setActiveDropdown('dest');
                  }}
                  className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold shrink-0 transition-colors cursor-pointer border border-neutral-200"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobility Mode Options - Minimalist 3-Pill Segment */}
          <div className="pt-1 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Mobility Priority
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'standard', label: '⚡ Fastest', desc: 'Any mode' },
                { id: 'wheelchair', label: '♿ Step-Free', desc: 'Ramps only' },
                { id: 'elderly', label: '🧓 Senior', desc: 'Min walk' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMobility(m.id)}
                  className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedMobility === m.id
                      ? 'bg-black text-white border-black shadow-xs font-bold'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="text-xs">{m.label}</div>
                  <div className={`text-[9px] mt-0.5 ${selectedMobility === m.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule & Travel Date Row */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <select
                value={timeMode}
                onChange={(e) => setTimeMode(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-700 focus:outline-none cursor-pointer"
              >
                <option value="now">⚡ Leave Now</option>
                <option value="depart">⏰ Depart at...</option>
                <option value="arrive">🏁 Arrive by...</option>
              </select>

              {timeMode !== 'now' && (
                <input
                  type="time"
                  value={departTime}
                  onChange={(e) => setDepartTime(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 font-bold text-xs text-neutral-900 focus:outline-none"
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Date</span>
              <input
                type="date"
                value={departDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDepartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 font-bold text-xs text-neutral-800 focus:outline-none cursor-pointer shadow-2xs"
              />
            </div>
          </div>

          {/* Submit Search CTA Button */}
          <button
            type="submit"
            disabled={isPlanning}
            className="w-full mt-2 py-3.5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-extrabold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPlanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Finding Best Routes & Fares...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Find Routes</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Search History (Interactive Instant Re-planning) */}
      {userRecentSearches && userRecentSearches.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
              Recent Search History
            </span>
            <span className="text-[11px] font-semibold text-neutral-400">Tap to plan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {userRecentSearches.slice(0, 4).map((rec, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(rec.origin, rec.destination)}
                className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-black text-left transition-all shadow-sm group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 group-hover:text-black truncate">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{rec.origin.name} → {rec.destination.name}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 flex items-center justify-between">
                  <span>Saved Route</span>
                  <span className="text-emerald-700 font-bold group-hover:underline">Plan Trip →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
