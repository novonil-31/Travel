import { useState, useEffect, useCallback } from 'react';
import {
  type UserLocationState,
  type IndianRegionKey,
  getSavedUserLocation,
  saveUserLocation,
  requestBrowserGeolocation,
  resolveAccurateLocation,
  calculateDistanceKm,
  setUserManualRegion,
  PRESET_REGIONS,
} from '../utils/userLocationService';

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<UserLocationState>(getSavedUserLocation());
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when location changes across components
  useEffect(() => {
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserLocationState>;
      if (customEvent.detail) {
        setUserLocation(customEvent.detail);
      }
    };

    window.addEventListener('access_user_location_changed', handleLocationChange);
    return () => window.removeEventListener('access_user_location_changed', handleLocationChange);
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLocating(true);
    setError(null);
    try {
      const loc = await requestBrowserGeolocation();
      setUserLocation(loc);
      return loc;
    } catch (err: any) {
      setError(err?.message || 'Location permission denied');
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Fully automatic background GPS tracking:
  // 1. Immediately detects location on app launch in the background.
  // 2. Continuously monitors GPS and refines the exact street/locality in the background.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    // Trigger initial background GPS acquisition
    requestLocation().catch(() => {});

    let watchId: number | null = null;
    let lastCoords: { lat: number; lng: number } | null = null;

    try {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // Refine exact location if user moved > 120m or on first position
          if (!lastCoords || calculateDistanceKm(lastCoords.lat, lastCoords.lng, lat, lng) > 0.12) {
            lastCoords = { lat, lng };
            try {
              const accurate = await resolveAccurateLocation(lat, lng);
              const updatedState: UserLocationState = {
                lat,
                lng,
                cityName: accurate.cityName,
                stateName: accurate.stateName,
                regionKey: accurate.regionKey,
                regionLabel: accurate.regionLabel,
                placeName: accurate.placeName,
                isCustom: false,
                permissionGranted: true,
                accuracyM: pos.coords.accuracy,
                detectedAt: Date.now(),
              };
              setUserLocation(updatedState);
              saveUserLocation(updatedState);
            } catch (err) {
              console.debug('Background location refinement error:', err);
            }
          }
        },
        (err) => {
          console.debug('Background GPS watch status:', err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 45000,
          timeout: 10000,
        }
      );
    } catch {
      // Ignore watch setup failures
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [requestLocation]);

  const setManualCity = useCallback((key: IndianRegionKey) => {
    const loc = setUserManualRegion(key);
    setUserLocation(loc);
    setError(null);
    return loc;
  }, []);

  return {
    userLocation,
    isLocating,
    error,
    requestLocation,
    setManualCity,
    presetRegions: PRESET_REGIONS,
  };
}
