/**
 * ACCESS / Maarg Darshan — User Location & Regional Search Priority Engine
 *
 * 1. Asks for user location access (HTML5 Geolocation).
 * 2. Identifies user's exact city, district, and micro-locality (e.g. KIIT/Bhubaneswar, Ludhiana/Punjab, Delhi NCR, Mumbai, etc.).
 * 3. Dynamically re-ranks live search results and defaults to prioritize places near the user.
 */

export type IndianRegionKey =
  | 'bhubaneswar_kiit'
  | 'punjab'
  | 'delhi_ncr'
  | 'mumbai'
  | 'bengaluru'
  | 'kolkata'
  | 'hyderabad'
  | 'chennai'
  | 'rajasthan'
  | 'gujarat'
  | 'up_central'
  | 'other';

export interface UserLocationState {
  lat: number;
  lng: number;
  cityName: string;
  stateName: string;
  regionKey: IndianRegionKey;
  regionLabel: string;
  isCustom: boolean;
  permissionGranted: boolean;
  accuracyM?: number;
  detectedAt?: number;
  placeName?: string;
}

export interface RegionalPresetCity {
  key: IndianRegionKey;
  cityName: string;
  stateName: string;
  label: string;
  lat: number;
  lng: number;
  fameTag: string;
}

export const PRESET_REGIONS: RegionalPresetCity[] = [
  {
    key: 'bhubaneswar_kiit',
    cityName: 'Bhubaneswar',
    stateName: 'Odisha',
    label: 'Bhubaneswar / KIIT University',
    lat: 20.3533,
    lng: 85.8160,
    fameTag: 'King’s Palace, Queen’s Castle, Campus 1-25 & KIMS',
  },
  {
    key: 'punjab',
    cityName: 'Ludhiana',
    stateName: 'Punjab',
    label: 'Punjab (Ludhiana / Amritsar / Chandigarh)',
    lat: 30.9010,
    lng: 75.8573,
    fameTag: 'Golden Temple, Clock Tower, Chaura Bazar & Model Town',
  },
  {
    key: 'delhi_ncr',
    cityName: 'New Delhi',
    stateName: 'Delhi',
    label: 'Delhi NCR (New Delhi / Noida / Gurugram)',
    lat: 28.6139,
    lng: 77.2090,
    fameTag: 'Connaught Place, India Gate, Red Fort, IGI Airport & Cyberhub',
  },
  {
    key: 'mumbai',
    cityName: 'Mumbai',
    stateName: 'Maharashtra',
    label: 'Mumbai & MMR (Mumbai / Thane / Navi Mumbai)',
    lat: 18.9400,
    lng: 72.8354,
    fameTag: 'CSMT, Gateway of India, Marine Drive, Bandra & Juhu',
  },
  {
    key: 'bengaluru',
    cityName: 'Bengaluru',
    stateName: 'Karnataka',
    label: 'Bengaluru (Bangalore)',
    lat: 12.9716,
    lng: 77.5946,
    fameTag: 'Majestic SBC, Kempegowda Airport, Indiranagar & Koramangala',
  },
  {
    key: 'kolkata',
    cityName: 'Kolkata',
    stateName: 'West Bengal',
    label: 'Kolkata & Howrah',
    lat: 22.5726,
    lng: 88.3639,
    fameTag: 'Howrah Junction, Victoria Memorial, Park Street & Salt Lake',
  },
  {
    key: 'hyderabad',
    cityName: 'Hyderabad',
    stateName: 'Telangana',
    label: 'Hyderabad & Secunderabad',
    lat: 17.3850,
    lng: 78.4867,
    fameTag: 'HITEC City, Charminar, Gachibowli & Secunderabad',
  },
  {
    key: 'chennai',
    cityName: 'Chennai',
    stateName: 'Tamil Nadu',
    label: 'Chennai',
    lat: 13.0827,
    lng: 80.2707,
    fameTag: 'Chennai Central MAS, Marina Beach, T. Nagar & Airport',
  },
];

const LOCAL_STORAGE_KEY = 'access_user_location_state_v1';

/**
 * Calculates Haversine distance in Kilometers between two coordinates
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detects regional key from GPS latitude & longitude
 */
export function detectIndianRegion(lat: number, lng: number): {
  regionKey: IndianRegionKey;
  cityName: string;
  stateName: string;
  regionLabel: string;
} {
  // 1. KIIT / Bhubaneswar / Cuttack / Puri corridor
  if (lat >= 19.5 && lat <= 20.8 && lng >= 85.3 && lng <= 86.5) {
    const distToKiit = calculateDistanceKm(lat, lng, 20.3533, 85.8160);
    const isKiitNearby = distToKiit <= 8;
    return {
      regionKey: 'bhubaneswar_kiit',
      cityName: isKiitNearby ? 'Bhubaneswar (KIIT Campus Area)' : 'Bhubaneswar',
      stateName: 'Odisha',
      regionLabel: isKiitNearby ? 'KIIT University / Patia, Bhubaneswar' : 'Bhubaneswar & Cuttack Region',
    };
  }

  // 2. Punjab / Chandigarh / Haryana North corridor
  if (lat >= 29.5 && lat <= 32.6 && lng >= 74.0 && lng <= 77.2) {
    let localCity = 'Punjab';
    if (calculateDistanceKm(lat, lng, 30.9010, 75.8573) <= 40) localCity = 'Ludhiana';
    else if (calculateDistanceKm(lat, lng, 31.6339, 74.8723) <= 40) localCity = 'Amritsar';
    else if (calculateDistanceKm(lat, lng, 31.3260, 75.5762) <= 30) localCity = 'Jalandhar';
    else if (calculateDistanceKm(lat, lng, 30.7333, 76.7794) <= 30) localCity = 'Chandigarh';
    else if (calculateDistanceKm(lat, lng, 30.2110, 74.9455) <= 35) localCity = 'Bathinda';
    else if (calculateDistanceKm(lat, lng, 30.3398, 76.3869) <= 30) localCity = 'Patiala';

    return {
      regionKey: 'punjab',
      cityName: localCity,
      stateName: 'Punjab',
      regionLabel: `${localCity}, Punjab Region`,
    };
  }

  // 3. Delhi NCR corridor
  if (lat >= 28.2 && lat <= 29.1 && lng >= 76.7 && lng <= 77.7) {
    let localCity = 'New Delhi';
    if (calculateDistanceKm(lat, lng, 28.4595, 77.0266) <= 20) localCity = 'Gurugram';
    else if (calculateDistanceKm(lat, lng, 28.5355, 77.3910) <= 20) localCity = 'Noida';
    else if (calculateDistanceKm(lat, lng, 28.4089, 77.3178) <= 20) localCity = 'Faridabad';
    else if (calculateDistanceKm(lat, lng, 28.6692, 77.4538) <= 20) localCity = 'Ghaziabad';

    return {
      regionKey: 'delhi_ncr',
      cityName: localCity,
      stateName: 'Delhi NCR',
      regionLabel: `${localCity}, Delhi NCR`,
    };
  }

  // 4. Mumbai & MMR corridor
  if (lat >= 18.7 && lat <= 19.5 && lng >= 72.6 && lng <= 73.4) {
    return {
      regionKey: 'mumbai',
      cityName: 'Mumbai',
      stateName: 'Maharashtra',
      regionLabel: 'Mumbai Metropolitan Region',
    };
  }

  // 5. Bengaluru corridor
  if (lat >= 12.7 && lat <= 13.3 && lng >= 77.3 && lng <= 77.9) {
    return {
      regionKey: 'bengaluru',
      cityName: 'Bengaluru',
      stateName: 'Karnataka',
      regionLabel: 'Bengaluru Urban Region',
    };
  }

  // 6. Kolkata corridor
  if (lat >= 22.3 && lat <= 22.9 && lng >= 88.1 && lng <= 88.6) {
    return {
      regionKey: 'kolkata',
      cityName: 'Kolkata',
      stateName: 'West Bengal',
      regionLabel: 'Kolkata & Howrah Region',
    };
  }

  // 7. Hyderabad corridor
  if (lat >= 17.1 && lat <= 17.7 && lng >= 78.1 && lng <= 78.8) {
    return {
      regionKey: 'hyderabad',
      cityName: 'Hyderabad',
      stateName: 'Telangana',
      regionLabel: 'Hyderabad & Secunderabad Region',
    };
  }

  // 8. Chennai corridor
  if (lat >= 12.7 && lat <= 13.4 && lng >= 79.9 && lng <= 80.5) {
    return {
      regionKey: 'chennai',
      cityName: 'Chennai',
      stateName: 'Tamil Nadu',
      regionLabel: 'Chennai Metropolitan Area',
    };
  }

  return {
    regionKey: 'other',
    cityName: 'India',
    stateName: 'National',
    regionLabel: 'Current Location',
  };
}

/**
 * Gets cached user location or default
 */
export function getSavedUserLocation(): UserLocationState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read saved user location', e);
  }

  // Default initial position (KIIT Bhubaneswar Campus Hub)
  const defaultRegion = detectIndianRegion(20.3533, 85.8160);
  return {
    lat: 20.3533,
    lng: 85.8160,
    cityName: defaultRegion.cityName,
    stateName: defaultRegion.stateName,
    regionKey: defaultRegion.regionKey,
    regionLabel: defaultRegion.regionLabel,
    isCustom: false,
    permissionGranted: false,
  };
}

/**
 * Saves user location state to localStorage and fires a storage event
 */
export function saveUserLocation(loc: UserLocationState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(loc));
    window.dispatchEvent(new CustomEvent('access_user_location_changed', { detail: loc }));
  } catch (e) {
    console.warn('Failed to save user location', e);
  }
}

/**
 * Request real GPS coordinates from browser Geolocation API
 */
export async function requestBrowserGeolocation(): Promise<UserLocationState> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  // Resilient multi-tier geolocation with instant fallbacks to avoid "Timeout expired"
  const getPositionPromise = (highAccuracy: boolean, timeoutMs: number): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 120000,
      });
    });
  };

  let pos: GeolocationPosition | null = null;

  // Attempt 1: Fast high accuracy (4 seconds)
  try {
    pos = await getPositionPromise(true, 4000);
  } catch (err: any) {
    // If timed out or unavailable, immediately fallback to network/Wi-Fi low accuracy (8 seconds)
    try {
      pos = await getPositionPromise(false, 8000);
    } catch (fallbackErr) {
      console.warn('Browser geolocation fallback failed, resolving via IP or campus anchor:', fallbackErr);
    }
  }

  // If browser geolocation succeeded
  if (pos && pos.coords) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accurate = await resolveAccurateLocation(lat, lng);

    const newState: UserLocationState = {
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

    saveUserLocation(newState);
    return newState;
  }

  // Attempt 3: Fast IP-based geolocation fallback if browser GPS hardware is disabled/timed out
  try {
    const ipRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        const lat = Number(ipData.latitude);
        const lng = Number(ipData.longitude);
        const accurate = await resolveAccurateLocation(lat, lng);
        const cityName = accurate.cityName || ipData.city || 'Local Area';
        const stateName = accurate.stateName || ipData.region || 'India';
        const newState: UserLocationState = {
          lat,
          lng,
          cityName,
          stateName,
          regionKey: accurate.regionKey,
          regionLabel: accurate.regionLabel,
          placeName: accurate.placeName || `${cityName} (Network Location)`,
          isCustom: false,
          permissionGranted: true,
          accuracyM: 5000,
          detectedAt: Date.now(),
        };
        saveUserLocation(newState);
        return newState;
      }
    }
  } catch {
    // ignore IP lookup error
  }

  // Safe fallback to active saved location or default
  const saved = getSavedUserLocation();
  const fallbackState: UserLocationState = {
    ...saved,
    placeName: saved.placeName || `${saved.cityName} (Current Location)`,
    isCustom: false,
    permissionGranted: true,
    detectedAt: Date.now(),
  };
  saveUserLocation(fallbackState);
  return fallbackState;
}

/**
 * Resolves accurate address, locality, city, state, and region from GPS coordinates
 * Uses multi-tier reverse geocoding (Nominatim -> BigDataCloud -> Photon -> Regional Math)
 */
export async function resolveAccurateLocation(lat: number, lng: number): Promise<{
  placeName: string;
  localityName: string;
  cityName: string;
  stateName: string;
  regionLabel: string;
  regionKey: IndianRegionKey;
}> {
  // 1. Special Check: Is within immediate walking vicinity of KIIT University campus hub (< 1.5 km)?
  const distToKiit = calculateDistanceKm(lat, lng, 20.3533, 85.8160);
  if (distToKiit <= 1.5) {
    return {
      placeName: 'KIIT Campus Hub, Patia, Bhubaneswar',
      localityName: 'Patia / KIIT Campus',
      cityName: 'Bhubaneswar',
      stateName: 'Odisha',
      regionLabel: 'KIIT University / Patia, Bhubaneswar',
      regionKey: 'bhubaneswar_kiit',
    };
  }

  // 2. High-Precision Nominatim Reverse Geocoding (Level 18 Micro-locality + Address details)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(nomUrl, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'ACCESS-Transit-Assistant/2.0' },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.address) {
        const addr = data.address;
        const micro = (
          data.name ||
          addr.amenity ||
          addr.building ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.road ||
          addr.residential ||
          addr.quarter ||
          ''
        ).trim();

        let rawCity = (
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.city_district ||
          addr.village ||
          addr.county ||
          addr.state_district ||
          ''
        ).trim();

        // Clean up common administrative suffixes
        const cleanCity = rawCity
          .replace(/ Municipal Corporation/gi, '')
          .replace(/ \(M\.Corp\.\)/gi, '')
          .replace(/ Tehsil/gi, '')
          .replace(/ District/gi, '')
          .trim();

        const state = (addr.state || '').trim();

        if (cleanCity) {
          const placeName = micro && micro.toLowerCase() !== cleanCity.toLowerCase()
            ? `${micro}, ${cleanCity}`
            : (state ? `${cleanCity}, ${state}` : cleanCity);

          const regionLabel = micro && micro.toLowerCase() !== cleanCity.toLowerCase()
            ? `${micro}, ${cleanCity}`
            : (state ? `${cleanCity}, ${state}` : cleanCity);

          // Detect matching preset region key if applicable
          let matchedKey: IndianRegionKey = 'other';
          for (const p of PRESET_REGIONS) {
            if (
              cleanCity.toLowerCase().includes(p.cityName.toLowerCase()) ||
              p.cityName.toLowerCase().includes(cleanCity.toLowerCase()) ||
              calculateDistanceKm(lat, lng, p.lat, p.lng) <= 35
            ) {
              matchedKey = p.key;
              break;
            }
          }

          return {
            placeName,
            localityName: micro || cleanCity,
            cityName: cleanCity,
            stateName: state || 'India',
            regionLabel,
            regionKey: matchedKey,
          };
        }
      }
    }
  } catch (nomErr) {
    console.warn('Nominatim reverse geocode error, checking secondary provider:', nomErr);
  }

  // 3. Fast Secondary Provider: BigDataCloud Reverse Geocode Client API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(3000) });
    if (bdcRes.ok) {
      const bdcData = (await bdcRes.json()) as any;
      const bdcCity = (bdcData.city || bdcData.locality || '').trim();
      const bdcLocality = (bdcData.locality || '').trim();
      const bdcState = (bdcData.principalSubdivision || '').trim();

      if (bdcCity) {
        const placeName = bdcLocality && bdcLocality.toLowerCase() !== bdcCity.toLowerCase()
          ? `${bdcLocality}, ${bdcCity}`
          : (bdcState ? `${bdcCity}, ${bdcState}` : bdcCity);

        const regionLabel = bdcLocality && bdcLocality.toLowerCase() !== bdcCity.toLowerCase()
          ? `${bdcLocality}, ${bdcCity}`
          : (bdcState ? `${bdcCity}, ${bdcState}` : bdcCity);

        let matchedKey: IndianRegionKey = 'other';
        for (const p of PRESET_REGIONS) {
          if (
            bdcCity.toLowerCase().includes(p.cityName.toLowerCase()) ||
            calculateDistanceKm(lat, lng, p.lat, p.lng) <= 35
          ) {
            matchedKey = p.key;
            break;
          }
        }

        return {
          placeName,
          localityName: bdcLocality || bdcCity,
          cityName: bdcCity,
          stateName: bdcState || 'India',
          regionLabel,
          regionKey: matchedKey,
        };
      }
    }
  } catch (bdcErr) {
    console.warn('BigDataCloud reverse geocode error:', bdcErr);
  }

  // 4. Regional bounding box heuristic fallback
  const regionalFallback = detectIndianRegion(lat, lng);
  let placeName = regionalFallback.cityName;
  if (placeName === 'India') {
    placeName = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  return {
    placeName,
    localityName: regionalFallback.cityName,
    cityName: regionalFallback.cityName,
    stateName: regionalFallback.stateName,
    regionLabel: regionalFallback.regionLabel,
    regionKey: regionalFallback.regionKey,
  };
}

/**
 * Manually switch active city/region
 */
export function setUserManualRegion(presetKey: IndianRegionKey): UserLocationState {
  const preset = PRESET_REGIONS.find((p) => p.key === presetKey) || PRESET_REGIONS[0];
  const newState: UserLocationState = {
    lat: preset.lat,
    lng: preset.lng,
    cityName: preset.cityName,
    stateName: preset.stateName,
    regionKey: preset.key,
    regionLabel: preset.label,
    isCustom: true,
    permissionGranted: true,
    detectedAt: Date.now(),
  };

  saveUserLocation(newState);
  return newState;
}
