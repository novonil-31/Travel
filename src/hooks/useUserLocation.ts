import { useState, useEffect, useCallback } from 'react';
import {
  type UserLocationState,
  type IndianRegionKey,
  getSavedUserLocation,
  saveUserLocation,
  requestBrowserGeolocation,
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

  // Automatically detect user GPS location on initial load ONLY if user has not chosen a manual region
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const saved = getSavedUserLocation();
      if (!saved.isCustom) {
        requestLocation().catch(() => {});
      }
    }
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
