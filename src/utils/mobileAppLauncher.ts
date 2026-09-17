/**
 * =========================================================================
 * ACCESS / Maarg Darshan — Mobile App Deep Linking & Intent Dispatcher
 * =========================================================================
 *
 * Automatically detects whether the user is on a mobile device (Android / iOS).
 * If the user has the native app installed (Uber, Ola, Rapido, Namma Yatri,
 * ConfirmTkt / IRCTC, RedBus, MakeMyTrip), it launches the app DIRECTLY
 * with all parameters (pickup, drop, dates, train number) pre-filled so the user
 * only has to pay.
 *
 * If the app is not installed, it cleanly falls back to the responsive pre-filled
 * web booking page without any error dialogs.
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

export interface DeepLinkConfig {
  appScheme: string;
  webFallback: string;
  packageName?: string; // Android package name for intent:// fallback
}

/**
 * Executes a native app launch with an automatic, resilient web fallback.
 */
export function launchMobileAppOrWeb(appSchemeUrl: string, webFallbackUrl: string, androidPackage?: string): void {
  if (typeof window === 'undefined') return;

  const isMobile = isMobileDevice();

  if (!isMobile) {
    // Desktop: Always open pre-filled web booking in new tab
    window.open(webFallbackUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // On Mobile: Try opening the native app first
  const startTime = Date.now();
  let hasHidden = false;

  const onVisibilityChange = () => {
    if (document.hidden || document.visibilityState === 'hidden') {
      hasHidden = true;
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange, { once: true });

  // 1. Android Intent format (if package specified and on Android)
  if (isAndroidDevice() && androidPackage && appSchemeUrl.includes('://')) {
    const schemePart = appSchemeUrl.split('://')[0];
    const pathPart = appSchemeUrl.split('://')[1] || '';
    const intentUrl = `intent://${pathPart}#Intent;scheme=${schemePart};package=${androidPackage};S.browser_fallback_url=${encodeURIComponent(webFallbackUrl)};end`;
    
    try {
      window.location.href = intentUrl;
      return;
    } catch {
      // Fall through to generic scheme attempt
    }
  }

  // 2. Standard custom URI scheme launch (iOS & Android)
  try {
    window.location.href = appSchemeUrl;
  } catch {
    // If browser blocks direct scheme invocation, open fallback
    window.location.href = webFallbackUrl;
    return;
  }

  // 3. Fallback timer: If app did not catch and browser didn't lose focus within 1200ms
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    const elapsed = Date.now() - startTime;
    // If user is still on this browser tab, the app is not installed -> open web fallback
    if (!hasHidden && document.visibilityState === 'visible' && elapsed < 2500) {
      window.location.href = webFallbackUrl;
    }
  }, 1200);
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

  const appScheme = `rapido://booking?src_lat=${pickupLat}&src_lng=${pickupLng}&src_name=${pName}&dest_lat=${dropLat}&dest_lng=${dropLng}&dest_name=${dName}&service=${service}`;
  const webFallback = `https://rapido.bike/booking?src_lat=${pickupLat}&src_lng=${pickupLng}&src_name=${pName}&dest_lat=${dropLat}&dest_lng=${dropLng}&dest_name=${dName}&service=${service}`;

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
  const webFallback = `https://nammayatri.in/open?src_lat=${pickupLat}&src_lng=${pickupLng}&src_name=${pName}&dest_lat=${dropLat}&dest_lng=${dropLng}&dest_name=${dName}`;

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

  // ConfirmTkt native app scheme
  const appScheme = `confirmtkt://search?fromStation=${originCode}&toStation=${destCode}&date=${confirmTktDate}${trainNumber ? `&trainNo=${trainNumber}` : ''}`;
  const webFallback = trainNumber
    ? `https://www.confirmtkt.com/rbooking-d/?trainNo=${trainNumber}&fromStation=${originCode}&toStation=${destCode}&date=${confirmTktDate}&quota=GN`
    : `https://www.confirmtkt.com/train-running-status/${originCode}-to-${destCode}?date=${confirmTktDate}`;

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
  const formattedDate = `${yearStr}-${monthStr}-${dayStr}`;

  const cleanOrig = originCity.split(',')[0].trim();
  const cleanDest = destCity.split(',')[0].trim();

  // RedBus native app scheme
  const appScheme = `redbus://search?fromCity=${encodeURIComponent(cleanOrig)}&toCity=${encodeURIComponent(cleanDest)}&doj=${formattedDate}`;
  const webFallback = `https://www.redbus.in/bus-tickets/${encodeURIComponent(cleanOrig.toLowerCase())}-to-${encodeURIComponent(cleanDest.toLowerCase())}?doj=${dayStr}-${monthStr}-${yearStr}`;

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

  const appScheme = `makemytrip://flight/search?orig=${originAirportCode}&dest=${destAirportCode}&date=${dayStr}/${monthStr}/${yearStr}`;
  const webFallback = `https://www.makemytrip.com/flight/search?itinerary=${originAirportCode}-${destAirportCode}-${dayStr}/${monthStr}/${yearStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;

  return {
    appScheme,
    webFallback,
    packageName: 'com.makemytrip',
  };
}
