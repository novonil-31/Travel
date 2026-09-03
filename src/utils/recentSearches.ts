/**
 * =========================================================================
 * ACCESS — User Search History & Recent Destination Storage
 * =========================================================================
 */

export interface SavedSearchRecord {
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'access_recent_searches_';
const LAST_DEST_KEY_PREFIX = 'access_last_dest_';

export function saveRecentSearch(
  userId: string | undefined,
  origin: { name: string; lat: number; lng: number },
  destination: { name: string; lat: number; lng: number },
) {
  if (!destination?.name || destination.name.trim().length === 0) return;

  const key = `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
  const lastKey = `${LAST_DEST_KEY_PREFIX}${userId || 'guest'}`;

  const record: SavedSearchRecord = {
    origin,
    destination,
    timestamp: Date.now(),
  };

  try {
    // Save last destination record
    localStorage.setItem(lastKey, JSON.stringify(record));

    // Save recent searches list (up to 6 items)
    const raw = localStorage.getItem(key);
    const existing: SavedSearchRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(
      (r) => r.destination.name.toLowerCase() !== destination.name.toLowerCase()
    );
    const updated = [record, ...filtered].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save recent search to localStorage:', err);
  }
}

export function getLastSearchedDestination(userId: string | undefined): SavedSearchRecord | null {
  const lastKey = `${LAST_DEST_KEY_PREFIX}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(lastKey);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSearchRecord;
  } catch {
    return null;
  }
}

export function getRecentSearches(userId: string | undefined): SavedSearchRecord[] {
  const key = `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSearchRecord[];
  } catch {
    return [];
  }
}
