import {
  createSearchEntries,
  normalizeSearchQuery,
  type SearchEntry,
  type SearchIndexPayload,
} from './search';

export const searchIndexPath = '/search-index';
export const recentSearchesLimit = 5;

const recentSearchesStorageKey = 'foliart:recent-searches';
const indexRequestTimeoutMs = 8_000;

const entriesByLocale = new Map<string, SearchEntry[]>();
const pendingByLocale = new Map<string, Promise<SearchEntry[]>>();

function isSearchIndexPayload(value: unknown): value is SearchIndexPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as SearchIndexPayload).documents)
  );
}

async function fetchSearchEntries(locale: string): Promise<SearchEntry[]> {
  const response = await fetch(`${searchIndexPath}/${locale}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(indexRequestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Failed to load the search index (${response.status})`);
  }

  const payload: unknown = await response.json();

  if (!isSearchIndexPayload(payload)) {
    throw new Error('Malformed search index payload');
  }

  return createSearchEntries(payload.documents);
}

/**
 * Loads the locale index once per page session. Entries are pre-folded, so
 * every keystroke afterwards is a synchronous in-memory scan.
 */
export function loadSearchEntries(locale: string): Promise<SearchEntry[]> {
  const cached = entriesByLocale.get(locale);
  if (cached) return Promise.resolve(cached);

  const pending = pendingByLocale.get(locale);
  if (pending) return pending;

  const request = fetchSearchEntries(locale)
    .then((entries) => {
      entriesByLocale.set(locale, entries);
      return entries;
    })
    .finally(() => {
      pendingByLocale.delete(locale);
    });

  pendingByLocale.set(locale, request);
  return request;
}

export function getLoadedSearchEntries(locale: string): SearchEntry[] | null {
  return entriesByLocale.get(locale) ?? null;
}

// ─── Recent searches ──────────────────────────────────────────────────────────

export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(recentSearchesStorageKey) ?? '[]',
    );

    if (!Array.isArray(stored)) return [];

    return stored
      .filter((item): item is string => typeof item === 'string')
      .map(normalizeSearchQuery)
      .filter(Boolean)
      .slice(0, recentSearchesLimit);
  } catch {
    return [];
  }
}

export function rememberRecentSearch(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized || typeof window === 'undefined') return readRecentSearches();

  const next = [
    normalized,
    ...readRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, recentSearchesLimit);

  try {
    window.localStorage.setItem(recentSearchesStorageKey, JSON.stringify(next));
  } catch {
    // Private mode or a full quota — recent searches are a nicety, not a feature.
  }

  return next;
}

export function clearRecentSearches(): string[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(recentSearchesStorageKey);
    } catch {
      // Ignored for the same reason as above.
    }
  }

  return [];
}
