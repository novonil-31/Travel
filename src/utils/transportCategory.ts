import type { RouteSearchResult } from '../types';

export type TransportType = 'bike' | 'auto' | 'cab' | 'carpool' | 'shared-taxi' | 'train' | 'flight' | 'bus' | 'walk' | 'ev' | 'cycle';

export interface RouteTransportInfo {
  type: TransportType;
  comparatorCategory: 'bike' | 'auto' | 'cab' | 'carpool' | 'all';
  icon: string;
  name: string;
  compareBannerTitle: string;
  compareBannerSubtitle: string;
  bookButtonLabel: string;
  compareButtonLabel: string;
}

export function getRouteTransportInfo(route?: RouteSearchResult | null): RouteTransportInfo {
  if (!route) {
    return {
      type: 'cab',
      comparatorCategory: 'cab',
      icon: '🚗',
      name: 'Private Cab',
      compareBannerTitle: 'Compare Private Cab Fares',
      compareBannerSubtitle: 'Uber • Ola • Rapido • BluSmart',
      bookButtonLabel: '🚗 Compare & Book Cab',
      compareButtonLabel: 'Compare Cabs',
    };
  }

  const rId = (route.route?.id || '').toLowerCase();
  const rName = (route.route?.name || '').toLowerCase();
  const shortName = (route.route?.shortName || '').toLowerCase();
  const vType = (route.route?.vehicleType || '').toLowerCase();

  // 1. Bus (Explicitly prioritize bus vehicles and transit lines - prevent express buses from ever being labeled as trains)
  const isBusRoute =
    vType === 'bus' ||
    rId.includes('bus') ||
    rName.includes('bus') ||
    shortName.includes('bus') ||
    shortName.startsWith('route ') ||
    rName.startsWith('mo bus');

  if (isBusRoute) {
    return {
      type: 'bus',
      comparatorCategory: 'all',
      icon: '🚌',
      name: 'Public Bus',
      compareBannerTitle: 'Public Transit Bus',
      compareBannerSubtitle: 'Scheduled city & highway bus service',
      bookButtonLabel: 'Book Bus Ticket',
      compareButtonLabel: 'View Timetable',
    };
  }

  // 2. Flight
  if (vType === 'flight' || route.travelScope === 'international' || rId.includes('flight') || rName.includes('flight') || rName.includes('air')) {
    return {
      type: 'flight',
      comparatorCategory: 'all',
      icon: '✈️',
      name: 'Commercial Flight',
      compareBannerTitle: 'Commercial Flight',
      compareBannerSubtitle: 'Fast point-to-point airline flight',
      bookButtonLabel: 'Book Flight Ticket',
      compareButtonLabel: 'View Flights',
    };
  }

  // 3. Train / Indian Railways (Strictly exclude buses)
  const isTrainRoute =
    vType === 'train' ||
    rId.includes('train') ||
    rId.includes('rail') ||
    rId.includes('irctc') ||
    (rName.includes('train') && !rName.includes('bus')) ||
    rName.includes('vande bharat') ||
    rName.includes('rajdhani') ||
    rName.includes('shatabdi') ||
    rName.includes('indian railways');

  if (isTrainRoute) {
    return {
      type: 'train',
      comparatorCategory: 'all',
      icon: '🚆',
      name: 'IRCTC Train',
      compareBannerTitle: 'Indian Railways Train',
      compareBannerSubtitle: 'Official IRCTC live timetable & booking',
      bookButtonLabel: 'Book IRCTC Train',
      compareButtonLabel: 'View Schedule',
    };
  }

  // 4. Carpool
  if (rId.includes('carpool') || rName.includes('carpool') || shortName.includes('carpool')) {
    return {
      type: 'carpool',
      comparatorCategory: 'carpool',
      icon: '🤝',
      name: 'Carpool',
      compareBannerTitle: 'Corridor Carpool Hub',
      compareBannerSubtitle: 'Match with verified co-riders & split costs',
      bookButtonLabel: '🤝 Carpool Hub',
      compareButtonLabel: 'Match Pool',
    };
  }

  // 5. Shared Taxi / Auto Stand
  if (rId.includes('shared') || rName.includes('sharing taxi') || rName.includes('auto stand')) {
    return {
      type: 'shared-taxi',
      comparatorCategory: 'auto',
      icon: '🚖',
      name: 'Shared Taxi / Stand Auto',
      compareBannerTitle: 'Stand Shared Taxi & Auto',
      compareBannerSubtitle: 'Regulated shared seat rate or match co-riders',
      bookButtonLabel: '🤝 Carpool Option',
      compareButtonLabel: 'Compare Autos',
    };
  }

  // 6. Bike Taxi (Rapido / Uber Moto / Ola Bike)
  if (
    rId.includes('bike') ||
    rName.includes('bike') ||
    rName.includes('rapido') ||
    rName.includes('moto') ||
    shortName.includes('bike') ||
    route.priceBreakdown?.itemizedLegs?.some((l: any) => l.mode === 'bike')
  ) {
    return {
      type: 'bike',
      comparatorCategory: 'bike',
      icon: '🛵',
      name: 'Bike Taxi',
      compareBannerTitle: 'Compare Bike Taxi Fares',
      compareBannerSubtitle: 'Rapido Bike • Uber Moto • Ola Bike',
      bookButtonLabel: '🛵 Compare & Book Bike Taxi',
      compareButtonLabel: 'Compare Bikes',
    };
  }

  // 7. Auto Rickshaw / E-Rickshaw
  if (
    rId.includes('auto') ||
    rId.includes('rickshaw') ||
    rName.includes('auto') ||
    rName.includes('rickshaw') ||
    shortName.includes('auto') ||
    route.priceBreakdown?.itemizedLegs?.some((l: any) => l.mode === 'auto')
  ) {
    return {
      type: 'auto',
      comparatorCategory: 'auto',
      icon: '🛺',
      name: 'Auto Rickshaw',
      compareBannerTitle: 'Compare Auto Rickshaw Fares',
      compareBannerSubtitle: 'Rapido Auto • Namma Yatri • Uber Auto • Ola Auto',
      bookButtonLabel: '🛺 Compare & Book Auto',
      compareButtonLabel: 'Compare Autos',
    };
  }

  // 8. Walk / Step Free
  if (rId.includes('walk') || rId.includes('step_free') || rName.includes('walk')) {
    return {
      type: 'walk',
      comparatorCategory: 'all',
      icon: '🚶',
      name: 'Walk',
      compareBannerTitle: 'Paved Walkway',
      compareBannerSubtitle: 'Step-free accessible walking path',
      bookButtonLabel: 'Start Walking Navigation',
      compareButtonLabel: 'Walk Path',
    };
  }

  // 9. EV Shuttle
  if (rId.includes('ev') || rName.includes('ev') || vType === 'campus-vehicle') {
    return {
      type: 'ev',
      comparatorCategory: 'all',
      icon: '⚡',
      name: 'Campus EV Shuttle',
      compareBannerTitle: 'Electric Campus Shuttle Buggy',
      compareBannerSubtitle: 'Zero-fare electric campus shuttle',
      bookButtonLabel: 'Track EV Shuttle',
      compareButtonLabel: 'Timetable',
    };
  }

  // 10. Cycle
  if (rId.includes('cycle') || rName.includes('cycle')) {
    return {
      type: 'cycle',
      comparatorCategory: 'bike',
      icon: '🚲',
      name: 'Campus Cycle Track',
      compareBannerTitle: 'Campus Dedicated Cycle Track',
      compareBannerSubtitle: 'Dedicated smart cycle lane',
      bookButtonLabel: 'Unlock Smart Cycle',
      compareButtonLabel: 'Cycle Track',
    };
  }

  // 11. Default: Private Cab / Taxi
  return {
    type: 'cab',
    comparatorCategory: 'cab',
    icon: '🚗',
    name: 'Private Cab',
    compareBannerTitle: 'Compare Private Cab Fares',
    compareBannerSubtitle: 'Uber Go • Ola Mini • BluSmart • Rapido Cab',
    bookButtonLabel: '🚗 Compare & Book Cab',
    compareButtonLabel: 'Compare Cabs',
  };
}
