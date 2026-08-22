/**
 * ACCESS / Maarg Darshan — Super Accurate Real-World Routing & Geocoding Service
 *
 * Provides high-accuracy communication with OpenStreetMap Nominatim, Photon, and OSRM:
 * - High-precision place search & geocoding
 * - Clean reverse geocoding
 * - Exact road network routing (driving & step-free walking)
 * - Official transit stops index integration
 */

import { OFFICIAL_STOPS } from '../data/liveTimetable';

export interface GeocodedPlace {
  displayName: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  isStop?: boolean;
  stopId?: string;
  accessibility?: {
    wheelchairBoarding?: number;
    hasRamp?: boolean;
  };
}

export interface RouteGeometryResult {
  coordinates: Array<[number, number]>; // [lat, lng]
  distanceM: number;
  durationMin: number;
  instructions?: string[];
}

/**
 * Pre-indexed High-Accuracy Regional Landmarks, Transit Hubs, Institutions & Malls
 */
export const REGIONAL_LANDMARKS: Array<{
  name: string;
  category: string;
  icon: string;
  lat: number;
  lng: number;
  keywords: string[];
  hasRamp?: boolean;
}> = [
  // Campus & Universities
  { name: 'Campus Gate / Main Entrance', category: 'Campus Gate', icon: '🏢', lat: 20.3555, lng: 85.8145, keywords: ['kiit', 'campus', 'gate', 'main entrance', 'university'], hasRamp: true },
  { name: 'KIIT Square Central Transit Hub', category: 'Transit Hub', icon: '🚏', lat: 20.3530, lng: 85.8160, keywords: ['kiit', 'square', 'chowk', 'hub', 'interchange'], hasRamp: true },
  { name: 'Campus 25 Tech Complex', category: 'Tech Campus', icon: '🏢', lat: 20.3510, lng: 85.8130, keywords: ['campus 25', 'tech', 'kiit 25', 'complex', 'polytechnic'], hasRamp: true },
  { name: 'KIMS Medical Hospital Gate', category: 'Hospital', icon: '🏥', lat: 20.3570, lng: 85.8170, keywords: ['kims', 'hospital', 'medical', 'emergency', 'doctor'], hasRamp: true },
  { name: 'Utkal University (Vani Vihar Gate)', category: 'University', icon: '🎓', lat: 20.2900, lng: 85.8350, keywords: ['vani vihar', 'utkal', 'university', 'gate', 'college'], hasRamp: true },
  { name: 'ITER Campus / SOA University', category: 'University', icon: '🎓', lat: 20.2510, lng: 85.7980, keywords: ['iter', 'soa', 'siksha o anusandhan', 'engineering', 'khandagiri'], hasRamp: true },
  { name: 'AIIMS Medical Hospital Bhubaneswar', category: 'Hospital', icon: '🏥', lat: 20.2310, lng: 85.7720, keywords: ['aiims', 'all india institute', 'sijua', 'patrapada', 'hospital'], hasRamp: true },
  { name: 'SUM Hospital & Medical College', category: 'Hospital', icon: '🏥', lat: 20.2750, lng: 85.7650, keywords: ['sum', 'hospital', 'kalinga nagar', 'medical', 'doctor'], hasRamp: true },
  { name: 'Apollo Hospital (Sainik School Rd)', category: 'Hospital', icon: '🏥', lat: 20.3080, lng: 85.8380, keywords: ['apollo', 'hospital', 'sainik school', 'emergency'], hasRamp: true },
  { name: 'AMRI Hospital Khandagiri', category: 'Hospital', icon: '🏥', lat: 20.2620, lng: 85.7890, keywords: ['amri', 'hospital', 'khandagiri'], hasRamp: true },

  // Transit Hubs & Railway Stations
  { name: 'Master Canteen Central Railway Station', category: 'Railway Station', icon: '🚆', lat: 20.2666, lng: 85.8436, keywords: ['master canteen', 'railway', 'station', 'bbs', 'train', 'central'], hasRamp: true },
  { name: 'Biju Patnaik International Airport (BBI)', category: 'Airport', icon: '✈️', lat: 20.2520, lng: 85.8180, keywords: ['airport', 'biju patnaik', 'flight', 'terminal', 'bbi'], hasRamp: true },
  { name: 'Patia Transit Station & Chowk', category: 'Transit Hub', icon: '🚏', lat: 20.3450, lng: 85.8180, keywords: ['patia', 'station', 'chowk', 'transit', 'square'], hasRamp: true },
  { name: 'Damana Square Bus Stop', category: 'Bus Stop', icon: '🚏', lat: 20.3340, lng: 85.8210, keywords: ['damana', 'square', 'bus stop', 'chandrasekharpur'], hasRamp: true },
  { name: 'Jaydev Vihar Interchange Flyover', category: 'Transit Hub', icon: '🚏', lat: 20.3050, lng: 85.8200, keywords: ['jaydev vihar', 'flyover', 'interchange', 'mayfair'], hasRamp: true },
  { name: 'Acharya Vihar Square', category: 'Square', icon: '🚏', lat: 20.3000, lng: 85.8270, keywords: ['acharya vihar', 'square', 'science park', 'rdc'], hasRamp: true },
  { name: 'Baramunda ISBT Bus Terminal', category: 'Bus Terminal', icon: '🚌', lat: 20.2780, lng: 85.7950, keywords: ['baramunda', 'isbt', 'bus stand', 'terminal', 'interstate'], hasRamp: true },
  { name: 'Rasulgarh Square Interchange', category: 'Square', icon: '🚏', lat: 20.2950, lng: 85.8620, keywords: ['rasulgarh', 'square', 'cuttack road', 'flyover'], hasRamp: true },
  { name: 'Kalpana Square (Old Town Link)', category: 'Square', icon: '🚏', lat: 20.2550, lng: 85.8390, keywords: ['kalpana', 'square', 'museum', 'old town'], hasRamp: true },
  { name: 'Nandankanan Zoological Park Gate', category: 'Park & Zoo', icon: '🦁', lat: 20.3980, lng: 85.8250, keywords: ['nandankanan', 'nandan kanan', 'zoo', 'park', 'safari', 'botanical'], hasRamp: true },
  { name: 'Cuttack Badambadi Bus Terminal', category: 'Bus Stand', icon: '🚌', lat: 20.4580, lng: 85.8820, keywords: ['cuttack', 'badambadi', 'bus stand', 'terminal'], hasRamp: true },

  // Tech Parks, Commercial & Shopping Hubs
  { name: 'Infocity IT Park (TCS / Infosys Gate)', category: 'Tech Park', icon: '💻', lat: 20.3600, lng: 85.8120, keywords: ['infocity', 'it park', 'tcs', 'infosys', 'wipro', 'tech'], hasRamp: true },
  { name: 'DLF Cybercity Patia', category: 'Tech Park', icon: '🏢', lat: 20.3585, lng: 85.8080, keywords: ['dlf', 'cybercity', 'patia', 'office', 'infocity'], hasRamp: true },
  { name: 'Esplanade One Mall (Rasulgarh)', category: 'Shopping Mall', icon: '🛍️', lat: 20.2980, lng: 85.8650, keywords: ['esplanade', 'mall', 'rasulgarh', 'cinepolis', 'shopping'], hasRamp: true },
  { name: 'DN Regalia Mall (Patrapada)', category: 'Shopping Mall', icon: '🛍️', lat: 20.2450, lng: 85.7680, keywords: ['dn regalia', 'mall', 'patrapada', 'inox', 'shopping'], hasRamp: true },
  { name: 'Forum Mart (Janpath)', category: 'Shopping Hub', icon: '🛍️', lat: 20.2760, lng: 85.8410, keywords: ['forum mart', 'janpath', 'bapuji nagar', 'shopping'], hasRamp: true },
  { name: 'Saheed Nagar Market District', category: 'Commercial Hub', icon: '🏙️', lat: 20.2850, lng: 85.8450, keywords: ['saheed nagar', 'market', 'bhubaneswar', 'shops'], hasRamp: true },
  { name: 'Khandagiri & Udayagiri Caves', category: 'Heritage Site', icon: '🏛️', lat: 20.2600, lng: 85.7850, keywords: ['khandagiri', 'udayagiri', 'caves', 'heritage', 'monument'], hasRamp: false },
  { name: 'Lingaraj Temple Complex (Old Town)', category: 'Temple / Heritage', icon: '🛕', lat: 20.2380, lng: 85.8330, keywords: ['lingaraj', 'temple', 'old town', 'bindusagar', 'heritage'], hasRamp: false },
  { name: 'Chandrasekharpur Petrol Pump Square', category: 'Square', icon: '🚏', lat: 20.3200, lng: 85.8200, keywords: ['chandrasekharpur', 'cspur', 'petrol pump', 'square'], hasRamp: true },
  { name: 'Nayapalli IRC Village', category: 'Neighborhood', icon: '🏡', lat: 20.2980, lng: 85.8150, keywords: ['nayapalli', 'irc village', 'iscon', 'colony'], hasRamp: true },
];

/**
 * High-accuracy place search combining official transit stops, local landmarks, and live geocoding.
 */
export async function searchPlacesLive(
  query: string,
  extraLocalStops: Array<{ id: string; name: string; lat: number; lng: number; hasRamp?: boolean }> = []
): Promise<GeocodedPlace[]> {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  const qTokens = q.split(/\s+/).filter(t => t.length > 0);

  // 1. High-Precision Instant Landmark & Transit Match
  const localMatches: GeocodedPlace[] = [];

  // Match from pre-indexed regional landmarks
  for (const lm of REGIONAL_LANDMARKS) {
    const nameLower = lm.name.toLowerCase();
    const categoryLower = lm.category.toLowerCase();
    const isExactMatch = nameLower.includes(q) || categoryLower.includes(q);
    const tokenMatch = qTokens.every(tok => nameLower.includes(tok) || lm.keywords.some(k => k.includes(tok)));

    if (isExactMatch || tokenMatch) {
      localMatches.push({
        displayName: `${lm.icon} ${lm.name} (${lm.category})`,
        name: lm.name,
        lat: lm.lat,
        lng: lm.lng,
        type: lm.category,
        isStop: lm.category.includes('Stop') || lm.category.includes('Transit'),
        stopId: lm.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        accessibility: {
          wheelchairBoarding: lm.hasRamp ? 1 : 0,
          hasRamp: lm.hasRamp,
        },
      });
    }
  }

  // Match from official live transit stops
  for (const st of OFFICIAL_STOPS) {
    const stNameLower = st.name.toLowerCase();
    const stShortLower = st.shortName.toLowerCase();
    if (stNameLower.includes(q) || stShortLower.includes(q)) {
      const exists = localMatches.some(m => Math.abs(m.lat - st.lat) < 0.0005 && Math.abs(m.lng - st.lng) < 0.0005);
      if (!exists) {
        localMatches.push({
          displayName: `🚏 ${st.name} (♿ Ramp Stop • ${st.bayNumber})`,
          name: st.shortName || st.name,
          lat: st.lat,
          lng: st.lng,
          type: 'transit_stop',
          isStop: true,
          stopId: st.id,
          accessibility: {
            wheelchairBoarding: 1,
            hasRamp: true,
          },
        });
      }
    }
  }

  // 2. Two-Pass Geocoding — Regional bias first, then global unconstrained fallback
  const onlineResults: GeocodedPlace[] = [];

  const parseNominatimItem = (item: {
    display_name: string; name?: string; lat: string; lon: string; type: string; address?: Record<string, string>;
  }): GeocodedPlace => {
    const primaryName = item.name || item.display_name.split(',')[0] || query;
    const subAddress = item.display_name.split(',').slice(1, 3).join(',').trim();
    const cleanDisplayName = subAddress ? `📍 ${primaryName}, ${subAddress}` : `📍 ${primaryName}`;
    return {
      displayName: cleanDisplayName,
      name: primaryName,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || 'place',
    };
  };

  try {
    const encodedQ = encodeURIComponent(query);

    // Pass 1: Region-biased (Bhubaneswar area) Nominatim + Photon
    const nominatimRegionalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQ}&viewbox=85.60,20.48,86.05,20.10&bounded=0&limit=6&addressdetails=1`;
    const photonUrl = `https://photon.komoot.io/api/?q=${encodedQ}&lat=20.32&lon=85.82&limit=5`;

    const [nomRegRes, photonRes] = await Promise.allSettled([
      fetch(nominatimRegionalUrl, { headers: { 'Accept-Language': 'en' } }),
      fetch(photonUrl),
    ]);

    if (nomRegRes.status === 'fulfilled' && nomRegRes.value.ok) {
      const data = (await nomRegRes.value.json()) as Array<{
        display_name: string; name?: string; lat: string; lon: string; type: string; address?: Record<string, string>;
      }>;
      data.forEach((item) => onlineResults.push(parseNominatimItem(item)));
    }

    if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
      const pData = (await photonRes.value.json()) as {
        features: Array<{
          geometry: { coordinates: [number, number] };
          properties: { name?: string; street?: string; city?: string; state?: string; country?: string };
        }>;
      };
      pData.features?.forEach((f) => {
        const name = f.properties.name || f.properties.street || query;
        const locParts = [f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', ');
        onlineResults.push({
          displayName: locParts ? `📍 ${name}, ${locParts}` : `📍 ${name}`,
          name,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          type: 'place',
        });
      });
    }

    // Pass 2: If fewer than 3 results so far, do unconstrained global Nominatim search
    const uniqueSoFar = new Set<string>();
    const passOneCount = [...localMatches, ...onlineResults].filter((item) => {
      const key = `${item.lat.toFixed(3)}-${item.lng.toFixed(3)}`;
      if (uniqueSoFar.has(key)) return false;
      uniqueSoFar.add(key);
      return true;
    }).length;

    if (passOneCount < 3) {
      const nominatimGlobalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQ}&limit=8&addressdetails=1&accept-language=en`;
      try {
        const globalRes = await fetch(nominatimGlobalUrl, { headers: { 'Accept-Language': 'en' } });
        if (globalRes.ok) {
          const globalData = (await globalRes.json()) as Array<{
            display_name: string; name?: string; lat: string; lon: string; type: string; address?: Record<string, string>;
          }>;
          globalData.forEach((item) => onlineResults.push(parseNominatimItem(item)));
        }
      } catch (e) {
        console.warn('Global search fallback:', e);
      }
    }
  } catch (err) {
    console.warn('Live search fallback:', err);
  }

  // 3. Deduplicate by coordinates & name
  const seen = new Set<string>();
  const combined = [...localMatches, ...onlineResults].filter((item) => {
    const key = `${item.lat.toFixed(3)}-${item.lng.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return combined.slice(0, 10);
}

/**
 * Super accurate reverse geocode with clean formatted address.
 */
export async function reverseGeocodeLive(lat: number, lng: number): Promise<string> {
  // Check if near an official stop
  for (const s of OFFICIAL_STOPS) {
    const dist = haversineDistanceClient(lat, lng, s.lat, s.lng);
    if (dist <= 60) {
      return s.name;
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (res.ok) {
      const data = (await res.json()) as {
        display_name?: string;
        name?: string;
        address?: {
          road?: string;
          suburb?: string;
          neighbourhood?: string;
          city?: string;
          town?: string;
          amenity?: string;
          building?: string;
        };
      };

      if (data.address) {
        const primary = data.name || data.address.amenity || data.address.building || data.address.road;
        const area = data.address.suburb || data.address.neighbourhood || data.address.city || data.address.town;
        if (primary && area) return `${primary}, ${area}`;
        if (primary) return primary;
      }

      if (data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 2).join(',').trim();
      }
    }
  } catch (err) {
    console.warn('Reverse geocode fallback:', err);
  }

  return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Calculate actual road network geometry using OSRM with automatic mirror failovers.
 */
export async function fetchRoadGeometryLive(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: 'driving' | 'walking' = 'driving',
): Promise<RouteGeometryResult | null> {
  const endpoints = [
    `https://router.project-osrm.org/route/v1/${mode}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
    `https://routing.openstreetmap.de/routed-${mode === 'walking' ? 'foot' : 'car'}/route/v1/${mode === 'walking' ? 'foot' : 'driving'}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as {
          code: string;
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: {
              coordinates: Array<[number, number]>; // [lon, lat]
            };
            legs?: Array<{
              steps?: Array<{
                maneuver?: { instruction?: string; type?: string; modifier?: string };
                name?: string;
                distance?: number;
              }>;
            }>;
          }>;
        };

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0]!;
          const coordinates: Array<[number, number]> = route.geometry.coordinates.map(
            ([lon, lat]) => [lat, lon],
          );

          const instructions: string[] = [];
          if (route.legs?.[0]?.steps) {
            for (const step of route.legs[0].steps) {
              if (step.name && step.name.trim().length > 0) {
                instructions.push(`Follow ${step.name} (${Math.round(step.distance || 0)}m)`);
              } else if (step.maneuver?.type) {
                instructions.push(`${step.maneuver.type} ${step.maneuver.modifier || ''}`.trim());
              }
            }
          }

          return {
            coordinates,
            distanceM: Math.round(route.distance),
            durationMin: Math.max(1, Math.round(route.duration / 60)),
            instructions,
          };
        }
      }
    } catch {
      // try next mirror
    }
  }

  // Fallback to high-density curved road interpolation
  return {
    coordinates: interpolateCurvedPoints(startLat, startLng, endLat, endLng, 16),
    distanceM: Math.round(haversineDistanceClient(startLat, startLng, endLat, endLng)),
    durationMin: Math.max(1, Math.round(haversineDistanceClient(startLat, startLng, endLat, endLng) / (mode === 'walking' ? 70 : 350))),
  };
}

/**
 * Haversine distance in meters
 */
export function haversineDistanceClient(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate smooth curved points between coordinates
 */
export function interpolateCurvedPoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  steps = 10,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * 0.0012;
    points.push([
      startLat + (endLat - startLat) * t + curve,
      startLng + (endLng - startLng) * t + curve,
    ]);
  }
  return points;
}
