/**
 * =========================================================================
 * ACCESS — Authentication & Guest Account Utilities
 * =========================================================================
 */

import type { User } from '../types';

/**
 * Checks whether a user represents a Guest session or an unauthenticated visitor.
 */
export function isGuestAccount(user: User | null | undefined): boolean {
  if (!user) return true;
  if ((user as any).isGuest === true) return true;
  if (user.id?.startsWith('guest-') || user.id === 'guest' || user.id === 'guest_user') return true;
  if (user.email === 'guest@transit.maarg' || user.email === 'guest@access.transit' || user.email?.toLowerCase().includes('guest')) return true;
  if (user.name?.toLowerCase().includes('guest passenger') || user.name?.toLowerCase() === 'guest') return true;
  return false;
}

/**
 * Checks whether a user is an officially authenticated logged-in account.
 */
export function isLoggedInAccount(user: User | null | undefined): boolean {
  return !isGuestAccount(user);
}

export interface FeatureComparisonItem {
  feature: string;
  category: string;
  guest: string;
  guestAllowed: boolean;
  member: string;
  memberAllowed: boolean;
  description: string;
}

export const GUEST_VS_MEMBER_COMPARISON: FeatureComparisonItem[] = [
  {
    feature: '1-Tap Home & Work Navigation',
    category: 'Commute',
    guest: '❌ Not Saved',
    guestAllowed: false,
    member: '✅ Cloud Synced',
    memberAllowed: true,
    description: 'Save daily Home, Office & Starred places for instant 1-tap route calculation.',
  },
  {
    feature: 'National Commuter Pass & Wallet',
    category: 'Perks',
    guest: '❌ Locked',
    guestAllowed: false,
    member: '✅ ₹50 Welcome Credit + 10% Off',
    memberAllowed: true,
    description: 'Instant discounts on Metro, Bus, Bike Taxi and Auto ride dispatch.',
  },
  {
    feature: 'Trusted Family SOS Live Dispatch',
    category: 'Safety',
    guest: '⚠️ Public 112 Only',
    guestAllowed: false,
    member: '✅ Auto WhatsApp to Family',
    memberAllowed: true,
    description: 'Alert up to 3 personal emergency contacts with real-time GPS & telemetry.',
  },
  {
    feature: 'Permanent Journey History & E-Receipts',
    category: 'History',
    guest: '⚠️ Temporary Session Cache',
    guestAllowed: false,
    member: '✅ Cloud Synced & GST Proofs',
    memberAllowed: true,
    description: 'Keep lifetime travel logs, carbon savings analytics, and downloadable receipts.',
  },
  {
    feature: 'Multi-Device Accessibility Profile',
    category: 'Accessibility',
    guest: '⚠️ Resets on Refresh',
    guestAllowed: false,
    member: '✅ Cloud Synchronized',
    memberAllowed: true,
    description: 'Wheelchair ramp preferences, crowd filters & walking limits sync across devices.',
  },
  {
    feature: 'Turn-by-Turn GPS Voice Navigation',
    category: 'Navigation',
    guest: '✅ Available',
    guestAllowed: true,
    member: '✅ Available',
    memberAllowed: true,
    description: 'Full spoken directions and speedometer work for all commuters.',
  },
  {
    feature: 'Pan-India Multimodal Route Discovery',
    category: 'Routing',
    guest: '✅ Available',
    guestAllowed: true,
    member: '✅ Available',
    memberAllowed: true,
    description: 'Search routes across 11 national city clusters and all Indian transit modes.',
  },
];

/**
 * Ensures a logged-in user always has their Commuter Pass data initialized.
 */
export function getOrCreateCommuterPass(user: User | null | undefined) {
  if (user?.commuterPass) return user.commuterPass;
  if (!user || isGuestAccount(user)) {
    return {
      passId: 'GUEST-PREVIEW',
      tier: 'standard' as const,
      balanceRupees: 0,
      discountPercent: 0,
      tripsCount: 0,
      carbonSavedKg: 0,
    };
  }
  return {
    passId: `MD-IN-${Math.abs(user.id.split('').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0) % 90000 + 10000)}`,
    tier: 'verified_commuter' as const,
    balanceRupees: 50.0,
    discountPercent: 10,
    tripsCount: 12,
    carbonSavedKg: 8.4,
  };
}
