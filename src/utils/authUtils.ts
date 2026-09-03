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
