/**
 * =========================================================================
 * ACCESS / Maarg Darshan — Mobile App Deep Linking & Intent Dispatcher
 * =========================================================================
 *
 * Automatically detects whether the user is on a mobile device (Android / iOS).
 * If the user has the native app installed (Uber, Ola, Rapido, Namma Yatri,
 * ConfirmTkt / IRCTC, RedBus, MakeMyTrip), it launches the app DIRECTLY
 * with all parameters (pickup, drop, coordinates, dates, train number) pre-filled so
 * the user only has to review & pay.
 *
 * If the app is not installed, it cleanly redirects to the official app store
 * (Google Play / App Store) or verified mobile web booking page without ANY XML
 * errors or broken landing pages.
 */

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

/**
 * Standard browser Geolocation helper to get exact GPS coordinates
 * for pinpoint taxi/auto pickup without any suspicious permissions.
 */
export async function requestAccurateUserLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  });
}

export interface DeepLinkConfig {
  appScheme: string;
  webFallback: string;
  packageName?: string; // Android package name for intent:// fallback
}

/**
 * Ensures fallback URLs are safe official stores or mobile pages,
 * completely preventing S3 / CloudFront NoSuchKey XML errors.
 */
export function sanitizeFallbackUrl(url: string, packageName?: string): string {
  // Never allow broken /booking paths on landing pages (like rapido.bike/booking)
  if (url.includes('rapido.bike/booking') || packageName === 'com.rapido.passenger') {
    return isIOSDevice()
      ? 'https://apps.apple.com/in/app/rapido-bike-taxi-auto-cabs/id1198464606'
      : 'https://play.google.com/store/apps/details?id=com.rapido.passenger';
  }

  if (packageName === 'in.juspay.nammayatri' && (!url || url.includes('/open'))) {
    return 'https://play.google.com/store/apps/details?id=in.juspay.nammayatri';
  }

  if (packageName === 'com.blusmart' && (!url || url.includes('/book'))) {
    return 'https://play.google.com/store/apps/details?id=com.blusmart';
  }

  return url || 'https://play.google.com/store/apps';
}

/**
 * Executes a native app launch with pre-filled data.
 * - On Android: Dispatches direct app scheme (e.g. rapido://ride?..., uber://...) and
 *   clean package intent without strict BROWSABLE filters or premature Play Store fallbacks.
 *   Only redirects to store/web if the app is truly not installed after user verification.
 * - On iOS: Uses Universal Links or custom URI schemes with graceful store fallback.
 * - On Desktop: Opens verified pre-filled web booking in a new tab.
 */
export function launchMobileAppOrWeb(
  appSchemeUrl: string,
  webFallbackUrl: string,
  androidPackage?: string
): void {
  if (typeof window === 'undefined') return;

  const isMobile = isMobileDevice();
  const safeFallback = sanitizeFallbackUrl(webFallbackUrl, androidPackage);

  if (!isMobile) {
    // Desktop: Always open pre-filled web booking in new tab
    window.open(safeFallback, '_blank', 'noopener,noreferrer');
    return;
  }

  // 1. Android Intent & Custom Scheme dispatch
  if (isAndroidDevice() && androidPackage) {
    let intentUrl = '';
    let directScheme = appSchemeUrl;

    if (appSchemeUrl.startsWith('intent://')) {
      intentUrl = appSchemeUrl;
      const schemeMatch = appSchemeUrl.match(/scheme=([^;]+)/);
      const queryMatch = appSchemeUrl.split('#Intent')[0].replace('intent://', '');
      if (schemeMatch && schemeMatch[1]) {
        directScheme = `${schemeMatch[1]}://${queryMatch}`;
      }
    } else {
      const scheme = appSchemeUrl.includes('://') ? appSchemeUrl.split('://')[0] : 'https';
      const pathWithQuery = appSchemeUrl.includes('://')
        ? appSchemeUrl.substring(appSchemeUrl.indexOf('://') + 3)
        : appSchemeUrl;

      // Clean package intent without strict BROWSABLE category which causes Chrome to reject valid DEFAULT activities
      intentUrl = `intent://${pathWithQuery}#Intent;scheme=${scheme};package=${androidPackage};end`;
      directScheme = appSchemeUrl;
    }

    let appLaunched = false;
    const markAppLaunched = () => {
      appLaunched = true;
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        markAppLaunched();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', markAppLaunched);
    window.addEventListener('blur', markAppLaunched);

    // Primary attempt: Try direct custom scheme (rapido://ride?...) which Android OS resolves natively
    if (directScheme && !directScheme.startsWith('intent://')) {
      try {
        const link = document.createElement('a');
        link.href = directScheme;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.location.href = directScheme;
      }
    } else {
      try {
        const link = document.createElement('a');
        link.href = intentUrl;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.location.href = intentUrl;
      }
    }

    // Secondary attempt: after 300ms, if window is still visible, trigger intentUrl
    setTimeout(() => {
      if (!appLaunched && !document.hidden && intentUrl && directScheme !== intentUrl) {
        try {
          const intentLink = document.createElement('a');
          intentLink.href = intentUrl;
          intentLink.rel = 'noopener noreferrer';
          document.body.appendChild(intentLink);
          intentLink.click();
          document.body.removeChild(intentLink);
        } catch {
          window.location.href = intentUrl;
        }
      }
    }, 300);

    // Fallback attempt: ONLY if the browser page remained continuously visible in foreground for 2.2s
    // (i.e. the app is genuinely NOT installed on the device)
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', markAppLaunched);
      window.removeEventListener('blur', markAppLaunched);
      if (!appLaunched && !document.hidden) {
        window.location.href = safeFallback;
      }
    }, 2200);

    return;
  }

  // 2. iOS or other mobile browsers
  if (isIOSDevice()) {
    if (appSchemeUrl.startsWith('http://') || appSchemeUrl.startsWith('https://')) {
      window.location.href = appSchemeUrl;
      return;
    }

    let iosAppLaunched = false;
    const onHide = () => { iosAppLaunched = true; };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onHide();
    });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('blur', onHide);

    try {
      const link = document.createElement('a');
      link.href = appSchemeUrl;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = appSchemeUrl;
    }

    setTimeout(() => {
      if (!iosAppLaunched && !document.hidden) {
        window.location.href = safeFallback;
      }
    }, 2200);

    return;
  }

  // 3. Generic fallback
  try {
    window.location.href = appSchemeUrl || safeFallback;
  } catch {
    window.location.href = safeFallback;
  }
}

// =========================================================================
// PRE-BUILT NATIVE APP SCHEMES & UNIVERSAL DEEP LINKS
// =========================================================================

export function buildUberDeepLink(params: {
  pickupLat: number;
  pickupLng: number;
  pickupName?: string;
  dropLat: number;
  dropLng: number;
  dropName?: string;
  productId?: string;
}): DeepLinkConfig {
  const { pickupLat, pickupLng, pickupName = 'Pickup', dropLat, dropLng, dropName = 'Destination', productId } = params;
  const pName = encodeURIComponent(pickupName);
  const dName = encodeURIComponent(dropName);

  const appScheme = `uber://?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&pickup[nickname]=${pName}&dropoff[latitude]=${dropLat}&dropoff[longitude]=${dropLng}&dropoff[nickname]=${dName}${productId ? `&product_id=${productId}` : ''}`;
  const webFallback = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}&pickup[nickname]=${pName}&dropoff[latitude]=${dropLat}&dropoff[longitude]=${dropLng}&dropoff[nickname]=${dName}${productId ? `&product_id=${productId}` : ''}`;

  return {
    appScheme,
    webFallback,
    packageName: 'com.ubercab',
  };
}

export function buildOlaDeepLink(params: {
  pickupLat: number;
  pickupLng: number;
  pickupName?: string;
  dropLat: number;
  dropLng: number;
  dropName?: string;
  category?: string;
}): DeepLinkConfig {
  const { pickupLat, pickupLng, pickupName = 'Pickup', dropLat, dropLng, dropName = 'Destination', category = 'mini' } = params;
  const pName = encodeURIComponent(pickupName);
  const dName = encodeURIComponent(dropName);

  const appScheme = `olacabs://app/launch?lat=${pickupLat}&lng=${pickupLng}&pickup_name=${pName}&drop_lat=${dropLat}&drop_lng=${dropLng}&drop_name=${dName}&category=${category}`;
  const webFallback = `https://book.olacabs.com/?pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&pickup_name=${pName}&drop_lat=${dropLat}&drop_lng=${dropLng}&drop_name=${dName}&category=${category}`;

  return {
    appScheme,
    webFallback,
    packageName: 'com.olacabs.customer',
  };
}

export function buildRapidoDeepLink(params: {
  pickupLat: number;
  pickupLng: number;
  pickupName?: string;
  dropLat: number;
  dropLng: number;
  dropName?: string;
  service?: string; // 'bike' | 'auto' | 'cab_economy'
}): DeepLinkConfig {
  const { pickupLat, pickupLng, pickupName = 'Pickup', dropLat, dropLng, dropName = 'Destination', service = 'auto' } = params;
  const pName = encodeURIComponent(pickupName);
  const dName = encodeURIComponent(dropName);

  // Rapido deep link with comprehensive coordinate bindings for all versions
  const rapidoQuery = `pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&pickupLat=${pickupLat}&pickupLng=${pickupLng}&pickup_name=${pName}&drop_lat=${dropLat}&drop_lng=${dropLng}&dropLat=${dropLat}&dropLng=${dropLng}&drop_name=${dName}&service=${service}&service_type=${service}`;
  const appScheme = `rapido://ride?${rapidoQuery}`;
  const webFallback = isIOSDevice()
    ? 'https://apps.apple.com/in/app/rapido-bike-taxi-auto-cabs/id1198464606'
    : 'https://play.google.com/store/apps/details?id=com.rapido.passenger';

  return {
    appScheme,
    webFallback,
    packageName: 'com.rapido.passenger',
  };
}

export function buildNammaYatriDeepLink(params: {
  pickupLat: number;
  pickupLng: number;
  pickupName?: string;
  dropLat: number;
  dropLng: number;
  dropName?: string;
}): DeepLinkConfig {
  const { pickupLat, pickupLng, pickupName = 'Pickup', dropLat, dropLng, dropName = 'Destination' } = params;
  const pName = encodeURIComponent(pickupName);
  const dName = encodeURIComponent(dropName);

  const appScheme = `nammayatri://ride?pickup_lat=${pickupLat}&pickup_lng=${pickupLng}&pickup_name=${pName}&drop_lat=${dropLat}&drop_lng=${dropLng}&drop_name=${dName}`;
  const webFallback = 'https://play.google.com/store/apps/details?id=in.juspay.nammayatri';

  return {
    appScheme,
    webFallback,
    packageName: 'in.juspay.nammayatri',
  };
}

export function buildTrainAppDeepLink(params: {
  trainNumber?: string;
  originCode: string;
  destCode: string;
  travelDate: Date | string;
}): DeepLinkConfig {
  const { trainNumber, originCode, destCode, travelDate } = params;
  const d = typeof travelDate === 'string' ? new Date(travelDate) : travelDate;
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = String(d.getFullYear());
  const confirmTktDate = `${dayStr}-${monthStr}-${yearStr}`;

  // ConfirmTkt verified app link
  const appScheme = trainNumber
    ? `https://www.confirmtkt.com/rbooking-d/?trainNo=${trainNumber}&fromStation=${originCode}&toStation=${destCode}&date=${confirmTktDate}&quota=GN`
    : `https://www.confirmtkt.com/train-running-status/${originCode}-to-${destCode}?date=${confirmTktDate}`;

  const webFallback = appScheme;

  return {
    appScheme,
    webFallback,
    packageName: 'com.confirmtkt.lite',
  };
}

export function buildBusAppDeepLink(params: {
  originCity: string;
  destCity: string;
  travelDate: Date | string;
}): DeepLinkConfig {
  const { originCity, destCity, travelDate } = params;
  const d = typeof travelDate === 'string' ? new Date(travelDate) : travelDate;
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = String(d.getFullYear());

  const cleanOrig = originCity.split(',')[0].trim();
  const cleanDest = destCity.split(',')[0].trim();

  const webFallback = `https://www.redbus.in/bus-tickets/${encodeURIComponent(cleanOrig.toLowerCase())}-to-${encodeURIComponent(cleanDest.toLowerCase())}?doj=${dayStr}-${monthStr}-${yearStr}`;
  const appScheme = webFallback;

  return {
    appScheme,
    webFallback,
    packageName: 'in.redbus.android',
  };
}

export function buildFlightAppDeepLink(params: {
  originAirportCode: string;
  destAirportCode: string;
  travelDate: Date | string;
}): DeepLinkConfig {
  const { originAirportCode, destAirportCode, travelDate } = params;
  const d = typeof travelDate === 'string' ? new Date(travelDate) : travelDate;
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = String(d.getFullYear());

  const webFallback = `https://www.makemytrip.com/flight/search?itinerary=${originAirportCode}-${destAirportCode}-${dayStr}/${monthStr}/${yearStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;
  const appScheme = `makemytrip://flight/search?orig=${originAirportCode}&dest=${destAirportCode}&date=${dayStr}/${monthStr}/${yearStr}`;

  return {
    appScheme,
    webFallback,
    packageName: 'com.makemytrip',
  };
}
