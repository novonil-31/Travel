/**
 * =========================================================================
 * ACCESS / Maarg Darshan — Regional Transport & App Availability Registry
 * =========================================================================
 *
 * Real-world operational geofencing and verified service registry across
 * Indian cities and transport aggregator apps (Uber, Ola, Rapido, Namma Yatri, BluSmart).
 *
 * Prevents showing phantom vehicles (e.g. Uber Auto in Bhubaneswar/Odisha where
 * Uber does NOT operate autos, or BluSmart outside NCR/BLR/MUM) and enforces
 * highway distance limits for bikes and city autos.
 */

export interface ProviderServiceStatus {
  active: boolean;
  notes?: string;
  reliabilityTier: 'HIGH' | 'MEDIUM' | 'UNAVAILABLE';
}

export interface CityTransportReport {
  cityName: string;
  stateName: string;
  regionKey: string;
  regionLabel: string;
  availableProviders: {
    rapido: {
      bike: ProviderServiceStatus;
      auto: ProviderServiceStatus;
      cab: ProviderServiceStatus;
    };
    uber: {
      cab: ProviderServiceStatus;
      auto: ProviderServiceStatus;
      moto: ProviderServiceStatus;
    };
    ola: {
      cab: ProviderServiceStatus;
      auto: ProviderServiceStatus;
    };
    nammaYatri: {
      auto: ProviderServiceStatus;
      cab: ProviderServiceStatus;
    };
    blusmart: {
      cab: ProviderServiceStatus;
    };
  };
  supportedVehicleIds: string[];
  unsupportedVehicleReasons: Record<string, string>;
  distanceWarning?: string | null;
  bestAutoRecommendation?: string;
  bestBikeRecommendation?: string;
  bestCabRecommendation?: string;
}

/**
 * Calculates straight line distance in km between two GPS coordinates
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
 * Evaluates operational availability for a given origin, destination, and distance.
 */
export function getTransportAvailabilityReport(
  pickupLat: number,
  pickupLng: number,
  distanceKm: number,
  pickupName?: string,
  dropName?: string
): CityTransportReport {
  const pName = (pickupName || '').toLowerCase();
  const dName = (dropName || '').toLowerCase();

  // Determine city / regional zone
  let cityName = 'City Region';
  let stateName = 'India';
  let regionKey = 'other';
  let regionLabel = 'Urban Transport Zone';

  // 1. Bhubaneswar / Cuttack / Puri / Odisha
  const isOdishaCoords = pickupLat >= 19.4 && pickupLat <= 21.0 && pickupLng >= 85.0 && pickupLng <= 86.8;
  const isOdishaName =
    pName.includes('bhubaneswar') ||
    pName.includes('cuttack') ||
    pName.includes('puri') ||
    pName.includes('kiit') ||
    pName.includes('patia') ||
    pName.includes('bbs') ||
    dName.includes('bhubaneswar') ||
    dName.includes('cuttack') ||
    dName.includes('master canteen');

  // 2. Delhi NCR
  const isDelhiCoords = pickupLat >= 28.2 && pickupLat <= 29.1 && pickupLng >= 76.7 && pickupLng <= 77.7;
  const isDelhiName =
    pName.includes('delhi') ||
    pName.includes('noida') ||
    pName.includes('gurgaon') ||
    pName.includes('gurugram') ||
    pName.includes('ghaziabad') ||
    pName.includes('faridabad');

  // 3. Bengaluru
  const isBlrCoords = pickupLat >= 12.7 && pickupLat <= 13.3 && pickupLng >= 77.3 && pickupLng <= 77.9;
  const isBlrName = pName.includes('bengaluru') || pName.includes('bangalore') || pName.includes('koramangala') || pName.includes('indiranagar');

  // 4. Mumbai / MMR
  const isMumCoords = pickupLat >= 18.7 && pickupLat <= 19.5 && pickupLng >= 72.6 && pickupLng <= 73.4;
  const isMumName = pName.includes('mumbai') || pName.includes('thane') || pName.includes('navi mumbai') || pName.includes('bandra');

  // 5. Kolkata
  const isKolCoords = pickupLat >= 22.3 && pickupLat <= 22.8 && pickupLng >= 88.1 && pickupLng <= 88.6;
  const isKolName = pName.includes('kolkata') || pName.includes('howrah') || pName.includes('salt lake');

  // 6. Hyderabad
  const isHydCoords = pickupLat >= 17.2 && pickupLat <= 17.6 && pickupLng >= 78.2 && pickupLng <= 78.7;
  const isHydName = pName.includes('hyderabad') || pName.includes('secunderabad') || pName.includes('hitec city');

  // 7. Punjab
  const isPunjabCoords = pickupLat >= 29.8 && pickupLat <= 32.5 && pickupLng >= 74.3 && pickupLng <= 77.0;
  const isPunjabName = pName.includes('ludhiana') || pName.includes('amritsar') || pName.includes('chandigarh') || pName.includes('jalandhar') || pName.includes('punjab');

  let isBhubaneswar = isOdishaCoords || isOdishaName;
  let isDelhi = isDelhiCoords || isDelhiName;
  let isBengaluru = isBlrCoords || isBlrName;
  let isMumbai = isMumCoords || isMumName;
  let isKolkata = isKolCoords || isKolName;
  let isHyderabad = isHydCoords || isHydName;
  let isPunjab = isPunjabCoords || isPunjabName;

  // Default to Bhubaneswar/Odisha if within default mock region or coords around 20.x, 85.x
  if (!isDelhi && !isBengaluru && !isMumbai && !isKolkata && !isHyderabad && !isPunjab) {
    if (Math.abs(pickupLat - 20.3) < 1.5 && Math.abs(pickupLng - 85.8) < 1.5) {
      isBhubaneswar = true;
    }
  }

  if (isBhubaneswar) {
    cityName = 'Bhubaneswar';
    stateName = 'Odisha';
    regionKey = 'bhubaneswar_kiit';
    regionLabel = 'Bhubaneswar / Cuttack Capital Region';
  } else if (isDelhi) {
    cityName = 'Delhi NCR';
    stateName = 'Delhi';
    regionKey = 'delhi_ncr';
    regionLabel = 'Delhi National Capital Region';
  } else if (isBengaluru) {
    cityName = 'Bengaluru';
    stateName = 'Karnataka';
    regionKey = 'bengaluru';
    regionLabel = 'Bengaluru Metropolitan Zone';
  } else if (isMumbai) {
    cityName = 'Mumbai';
    stateName = 'Maharashtra';
    regionKey = 'mumbai';
    regionLabel = 'Mumbai Metropolitan Region (MMR)';
  } else if (isKolkata) {
    cityName = 'Kolkata';
    stateName = 'West Bengal';
    regionKey = 'kolkata';
    regionLabel = 'Greater Kolkata & Howrah';
  } else if (isHyderabad) {
    cityName = 'Hyderabad';
    stateName = 'Telangana';
    regionKey = 'hyderabad';
    regionLabel = 'Hyderabad Urban Development Authority';
  } else if (isPunjab) {
    cityName = 'Punjab';
    stateName = 'Punjab';
    regionKey = 'punjab';
    regionLabel = 'Punjab & Chandigarh Region';
  }

  // Define operational capabilities
  const supportedVehicleIds: string[] = [];
  const unsupportedVehicleReasons: Record<string, string> = {};

  // Distance boundaries
  const isBikeDistanceValid = distanceKm <= 18.0;
  const isAutoDistanceValid = distanceKm <= 25.0;

  let distanceWarning: string | null = null;
  if (!isBikeDistanceValid && distanceKm > 18.0) {
    distanceWarning = `Trip distance (${distanceKm.toFixed(1)} km) exceeds safe Bike Taxi limits (max 18 km).`;
  }
  if (!isAutoDistanceValid && distanceKm > 25.0) {
    distanceWarning = `Trip distance (${distanceKm.toFixed(1)} km) crosses municipal auto boundaries (max 25 km). Use Cabs or Public Transit.`;
  }

  // --- UBER AVAILABILITY ---
  // Uber Go: Available almost everywhere in India
  supportedVehicleIds.push('uber-go');

  // Uber Moto: Available in select cities and short distances
  const uberMotoActiveInCity = isDelhi || isBengaluru || isHyderabad || isBhubaneswar || isPunjab || isKolkata;
  if (uberMotoActiveInCity && isBikeDistanceValid) {
    supportedVehicleIds.push('uber-moto');
  } else if (!isBikeDistanceValid) {
    unsupportedVehicleReasons['uber-moto'] = `Uber Moto is restricted to intra-city rides under 18 km (this trip is ${distanceKm.toFixed(1)} km).`;
  } else {
    unsupportedVehicleReasons['uber-moto'] = `Uber Moto is not currently operational in ${cityName}.`;
  }

  // Uber Auto: Real ground truth — NOT available in Bhubaneswar/Odisha!
  const uberAutoActiveInCity = isDelhi || isBengaluru || isHyderabad || isMumbai || (isPunjab && pName.includes('chandigarh'));
  if (uberAutoActiveInCity && isAutoDistanceValid) {
    supportedVehicleIds.push('uber-auto');
  } else if (!uberAutoActiveInCity) {
    unsupportedVehicleReasons['uber-auto'] = isBhubaneswar
      ? 'Uber Auto is NOT operational in Bhubaneswar / Odisha. Uber only offers Uber Go and Uber Moto here. Use Rapido Auto or Ola Auto instead.'
      : `Uber Auto does not operate in ${cityName}. Please book via Rapido Auto or Ola Auto.`;
  } else if (!isAutoDistanceValid) {
    unsupportedVehicleReasons['uber-auto'] = `Trip distance (${distanceKm.toFixed(1)} km) exceeds Uber Auto city limits (max 25 km).`;
  }

  // --- RAPIDO AVAILABILITY ---
  // Rapido Auto: Highly active in Bhubaneswar, Bangalore, Delhi, Hyderabad, etc.
  if (isAutoDistanceValid && !isMumbai) {
    supportedVehicleIds.push('rapido-auto');
  } else if (!isAutoDistanceValid) {
    unsupportedVehicleReasons['rapido-auto'] = `Trip distance (${distanceKm.toFixed(1)} km) exceeds safe auto limits (max 25 km).`;
  } else if (isMumbai) {
    unsupportedVehicleReasons['rapido-auto'] = 'Rapido Auto operates in Mumbai suburbs only.';
  }

  // Rapido Bike: Dominant across Tier 1, 2, 3
  if (isBikeDistanceValid && !isMumbai) {
    supportedVehicleIds.push('rapido-bike');
  } else if (!isBikeDistanceValid) {
    unsupportedVehicleReasons['rapido-bike'] = `Bike Taxi distance limit is 18 km (this journey is ${distanceKm.toFixed(1)} km).`;
  } else if (isMumbai) {
    unsupportedVehicleReasons['rapido-bike'] = 'Bike Taxis are legally restricted in Mumbai city limits.';
  }

  // Rapido Cab: Available in major corridors
  supportedVehicleIds.push('rapido-cab');

  // --- OLA AVAILABILITY ---
  supportedVehicleIds.push('ola-mini');
  if (isAutoDistanceValid) {
    supportedVehicleIds.push('ola-auto');
  } else {
    unsupportedVehicleReasons['ola-auto'] = `Trip distance (${distanceKm.toFixed(1)} km) exceeds Ola Auto city limits (max 25 km).`;
  }

  // --- NAMMA YATRI (ONDC) AVAILABILITY ---
  // Active in Bengaluru, Delhi NCR, Kochi, Kolkata (Yatri Sathi), Hyderabad, Chennai
  const nammaYatriActiveInCity = isBengaluru || isDelhi || isKolkata || isHyderabad;
  if (nammaYatriActiveInCity && isAutoDistanceValid) {
    supportedVehicleIds.push('namma-yatri-auto');
    if (isBengaluru || isKolkata || isHyderabad) {
      supportedVehicleIds.push('namma-yatri-cab');
    }
  } else {
    unsupportedVehicleReasons['namma-yatri-auto'] = `Namma Yatri / ONDC Auto is currently active in Bengaluru, Delhi NCR, Kochi & Kolkata (Yatri Sathi). Not yet in ${cityName}.`;
    unsupportedVehicleReasons['namma-yatri-cab'] = `Namma Yatri Cabs are not yet operational in ${cityName}.`;
  }

  // --- BLUSMART EV AVAILABILITY ---
  // Only operates in Delhi NCR, Bengaluru, and Mumbai
  const blusmartActiveInCity = isDelhi || isBengaluru || isMumbai;
  if (blusmartActiveInCity) {
    supportedVehicleIds.push('blusmart-ev');
  } else {
    unsupportedVehicleReasons['blusmart-ev'] = `BluSmart 100% Electric Cabs operate exclusively in Delhi NCR, Bengaluru & Mumbai. Not available in ${cityName}.`;
  }

  // Best recommendations
  const bestAutoRecommendation = supportedVehicleIds.includes('rapido-auto')
    ? 'Rapido Auto'
    : supportedVehicleIds.includes('ola-auto')
      ? 'Ola Auto'
      : supportedVehicleIds.includes('namma-yatri-auto')
        ? 'Namma Yatri Auto'
        : 'Local City Auto Stand';

  const bestBikeRecommendation = supportedVehicleIds.includes('rapido-bike')
    ? 'Rapido Bike'
    : supportedVehicleIds.includes('uber-moto')
      ? 'Uber Moto'
      : 'Solo Metro/Bus';

  const bestCabRecommendation = 'Uber Go / Ola Mini';

  return {
    cityName,
    stateName,
    regionKey,
    regionLabel,
    availableProviders: {
      rapido: {
        auto: {
          active: supportedVehicleIds.includes('rapido-auto'),
          reliabilityTier: supportedVehicleIds.includes('rapido-auto') ? 'HIGH' : 'UNAVAILABLE',
          notes: isBhubaneswar ? 'Primary auto hailing service in Bhubaneswar with instant driver allocation.' : undefined,
        },
        bike: {
          active: supportedVehicleIds.includes('rapido-bike'),
          reliabilityTier: supportedVehicleIds.includes('rapido-bike') ? 'HIGH' : 'UNAVAILABLE',
          notes: isBikeDistanceValid ? 'Fastest for single commuters in city traffic.' : 'Distance exceeds 18 km.',
        },
        cab: {
          active: true,
          reliabilityTier: 'MEDIUM',
          notes: 'Economy AC Cab fleet.',
        },
      },
      uber: {
        cab: {
          active: true,
          reliabilityTier: 'HIGH',
          notes: 'Widely available across city & outstation routes.',
        },
        auto: {
          active: supportedVehicleIds.includes('uber-auto'),
          reliabilityTier: supportedVehicleIds.includes('uber-auto') ? 'HIGH' : 'UNAVAILABLE',
          notes: uberAutoActiveInCity ? 'Uber Auto operating in this zone.' : `Not operational in ${cityName}.`,
        },
        moto: {
          active: supportedVehicleIds.includes('uber-moto'),
          reliabilityTier: supportedVehicleIds.includes('uber-moto') ? 'HIGH' : 'UNAVAILABLE',
          notes: isBikeDistanceValid ? 'Verified helmet provided.' : 'Distance exceeds 18 km.',
        },
      },
      ola: {
        cab: {
          active: true,
          reliabilityTier: 'HIGH',
          notes: 'Compact AC with instant OTP dispatch.',
        },
        auto: {
          active: supportedVehicleIds.includes('ola-auto'),
          reliabilityTier: supportedVehicleIds.includes('ola-auto') ? 'HIGH' : 'UNAVAILABLE',
          notes: isAutoDistanceValid ? 'Verified auto drivers with digital meter.' : 'Distance exceeds 25 km.',
        },
      },
      nammaYatri: {
        auto: {
          active: supportedVehicleIds.includes('namma-yatri-auto'),
          reliabilityTier: supportedVehicleIds.includes('namma-yatri-auto') ? 'HIGH' : 'UNAVAILABLE',
          notes: nammaYatriActiveInCity ? 'Zero commission government meter rates.' : `Not yet expanded to ${cityName}.`,
        },
        cab: {
          active: supportedVehicleIds.includes('namma-yatri-cab'),
          reliabilityTier: supportedVehicleIds.includes('namma-yatri-cab') ? 'HIGH' : 'UNAVAILABLE',
        },
      },
      blusmart: {
        cab: {
          active: supportedVehicleIds.includes('blusmart-ev'),
          reliabilityTier: supportedVehicleIds.includes('blusmart-ev') ? 'HIGH' : 'UNAVAILABLE',
          notes: blusmartActiveInCity ? '100% Electric zero-surge rides.' : 'Active in Delhi NCR, BLR, BOM only.',
        },
      },
    },
    supportedVehicleIds,
    unsupportedVehicleReasons,
    distanceWarning,
    bestAutoRecommendation,
    bestBikeRecommendation,
    bestCabRecommendation,
  };
}
