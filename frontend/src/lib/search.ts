import { transliterateCyrillic } from './catalog';

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 120;
export const SEARCH_SUGGESTION_LIMIT = 8;
export const SEARCH_RESULTS_LIMIT = 60;

export type SearchDocumentType = 'product' | 'category' | 'article' | 'calendar' | 'page';

export type SearchDocument = {
  /** Stable identifier, unique across types: `product:12`. */
  id: string;
  type: SearchDocumentType;
  title: string;
  /** Locale-less path used with the next-intl `Link`. */
  href: string;
  description?: string;
  /** Short breadcrumb-ish label: category name for products, section for pages. */
  context?: string;
  image?: string | null;
  keywords?: string[];
  /** ISO date, only for articles — used to sort the "latest" blocks. */
  date?: string;
};

export type SearchHit = {
  document: SearchDocument;
  score: number;
};

export type SearchIndexPayload = {
  locale: string;
  documents: SearchDocument[];
};

export const searchDocumentTypes: SearchDocumentType[] = [
  'product',
  'category',
  'article',
  'calendar',
  'page',
];

// Products are the primary intent on a fertilizer site, pages the least specific.
const typeWeights: Record<SearchDocumentType, number> = {
  product: 14,
  category: 11,
  article: 8,
  calendar: 7,
  page: 6,
};

const typeOrder = new Map(searchDocumentTypes.map((type, index) => [type, index]));

// ─── Text normalisation ───────────────────────────────────────────────────────

const combiningMarksPattern = /[\u0300-\u036f]/g;
const nonAlphanumericPattern = /[^\p{L}\p{N}]+/gu;

/**
 * Lowercases, drops accents/`ё`, and turns every separator into a single space,
 * so that "Zn 160- аминохелат" and "zn160 аминохелат" fold to comparable text.
 */
export function foldSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFKD')
    .replace(combiningMarksPattern, '')
    .replace(nonAlphanumericPattern, ' ')
    .trim();
}

/** Folded text mapped to latin, so "азот" matches "azot" and vice versa. */
export function toLatinSearchText(foldedValue: string): string {
  return transliterateCyrillic(foldedValue);
}

// ЙЦУКЕН ↔ QWERTY, keyed by the physical key. Lets "abkbfhn" find "фолиарт".
const keyboardLayoutPairs = [
  ['й', 'q'],
  ['ц', 'w'],
  ['у', 'e'],
  ['к', 'r'],
  ['е', 't'],
  ['н', 'y'],
  ['г', 'u'],
  ['ш', 'i'],
  ['щ', 'o'],
  ['з', 'p'],
  ['х', '['],
  ['ъ', ']'],
  ['ф', 'a'],
  ['ы', 's'],
  ['в', 'd'],
  ['а', 'f'],
  ['п', 'g'],
  ['р', 'h'],
  ['о', 'j'],
  ['л', 'k'],
  ['д', 'l'],
  ['ж', ';'],
  ['э', "'"],
  ['я', 'z'],
  ['ч', 'x'],
  ['с', 'c'],
  ['м', 'v'],
  ['и', 'b'],
  ['т', 'n'],
  ['ь', 'm'],
  ['б', ','],
  ['ю', '.'],
] as const;

const keyboardLayoutMap = new Map<string, string>();
for (const [cyrillic, latin] of keyboardLayoutPairs) {
  keyboardLayoutMap.set(cyrillic, latin);
  keyboardLayoutMap.set(latin, cyrillic);
}

/** Re-types the query as if the other keyboard layout had been active. */
export function swapKeyboardLayout(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((char) => keyboardLayoutMap.get(char) ?? char)
    .join('');
}

export function normalizeSearchQuery(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export function isSearchableQuery(value: string | null | undefined): boolean {
  return foldSearchText(normalizeSearchQuery(value)).replace(/\s/g, '').length >=
    SEARCH_MIN_QUERY_LENGTH;
}

// ─── Index entries ────────────────────────────────────────────────────────────

type FieldSet = {
  title: string;
  titleWords: string[];
  secondary: string;
  body: string;
};

export type SearchEntry = {
  document: SearchDocument;
  folded: FieldSet;
  latin: FieldSet;
};

function buildFieldSet(title: string, secondary: string, body: string): FieldSet {
  return {
    title,
    titleWords: title.split(' ').filter(Boolean),
    secondary,
    body,
  };
}

function toLatinFieldSet(fields: FieldSet): FieldSet {
  return {
    title: toLatinSearchText(fields.title),
    titleWords: fields.titleWords.map(toLatinSearchText),
    secondary: toLatinSearchText(fields.secondary),
    body: toLatinSearchText(fields.body),
  };
}

export function createSearchEntry(document: SearchDocument): SearchEntry {
  const title = foldSearchText(document.title);
  const secondary = foldSearchText(
    [document.context ?? '', ...(document.keywords ?? [])].join(' '),
  );
  const body = foldSearchText(document.description ?? '');
  const folded = buildFieldSet(title, secondary, body);

  return { document, folded, latin: toLatinFieldSet(folded) };
}

export function createSearchEntries(documents: SearchDocument[]): SearchEntry[] {
  return documents.map(createSearchEntry);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** True when `a` and `b` differ by at most one insert/delete/replace. */
function isWithinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let shortIndex = 0;
  let longIndex = 0;
  let edits = 0;

  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (shorter.length === longer.length) {
      shortIndex += 1;
    }
    longIndex += 1;
  }

  return true;
}

function scoreTokenAgainstFields(fields: FieldSet, token: string): number {
  if (!token) return 0;

  if (fields.title === token) return 130;
  if (fields.title.startsWith(`${token} `)) return 90;

  let best = 0;

  for (const word of fields.titleWords) {
    if (word === token) {
      best = Math.max(best, 80);
    } else if (word.startsWith(token)) {
      best = Math.max(best, 62);
    } else if (token.length >= 4 && word.includes(token)) {
      best = Math.max(best, 44);
    } else if (token.length >= 4 && isWithinOneEdit(word, token)) {
      // Typo tolerance stays below every exact signal so it never outranks one.
      best = Math.max(best, 26);
    }
  }

  if (best === 0 && fields.title.includes(token)) {
    best = 38;
  }

  if (best === 0 && fields.secondary) {
    if (fields.secondary.split(' ').some((word) => word.startsWith(token))) {
      best = 24;
    } else if (token.length >= 4 && fields.secondary.includes(token)) {
      best = 18;
    }
  }

  if (best === 0 && fields.body) {
    if (fields.body.split(' ').some((word) => word.startsWith(token))) {
      best = 12;
    } else if (token.length >= 4 && fields.body.includes(token)) {
      best = 8;
    }
  }

  return best;
}

function scoreEntryForVariant(entry: SearchEntry, foldedQuery: string): number {
  const tokens = foldedQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return 0;

  const latinTokens = tokens.map(toLatinSearchText);
  let total = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const score = Math.max(
      scoreTokenAgainstFields(entry.folded, tokens[index]),
      scoreTokenAgainstFields(entry.latin, latinTokens[index]),
    );

    // Every token has to land somewhere — search stays conjunctive.
    if (score === 0) return 0;
    total += score;
  }

  const phrase = tokens.join(' ');
  const latinPhrase = latinTokens.join(' ');

  if (entry.folded.title.startsWith(phrase) || entry.latin.title.startsWith(latinPhrase)) {
    total += 70;
  } else if (entry.folded.title.includes(phrase) || entry.latin.title.includes(latinPhrase)) {
    total += 35;
  }

  total += typeWeights[entry.document.type];
  // Prefer the tighter title when two documents match equally well.
  total -= Math.min(entry.folded.title.length, 80) / 25;

  return total;
}

function buildQueryVariants(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  const folded = foldSearchText(normalized);
  const variants = new Set<string>();

  if (folded) variants.add(folded);

  const swapped = foldSearchText(swapKeyboardLayout(normalized));
  if (swapped && swapped !== folded) variants.add(swapped);

  return Array.from(variants);
}

export type SearchOptions = {
  limit?: number;
  types?: SearchDocumentType[];
};

export function searchEntries(
  entries: SearchEntry[],
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  if (!isSearchableQuery(query)) return [];

  const variants = buildQueryVariants(query);
  if (variants.length === 0) return [];

  const allowedTypes = options.types?.length ? new Set(options.types) : null;
  const hits: SearchHit[] = [];

  for (const entry of entries) {
    if (allowedTypes && !allowedTypes.has(entry.document.type)) continue;

    let score = 0;
    for (const variant of variants) {
      score = Math.max(score, scoreEntryForVariant(entry, variant));
    }

    if (score > 0) hits.push({ document: entry.document, score });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const typeDelta =
      (typeOrder.get(a.document.type) ?? 0) - (typeOrder.get(b.document.type) ?? 0);
    if (typeDelta !== 0) return typeDelta;

    return a.document.title.localeCompare(b.document.title);
  });

  const limit = options.limit ?? SEARCH_RESULTS_LIMIT;
  return limit > 0 ? hits.slice(0, limit) : hits;
}

export function searchDocuments(
  documents: SearchDocument[],
  query: string,
  options: SearchOptions = {},
): SearchHit[] {
  return searchEntries(createSearchEntries(documents), query, options);
}

export function countHitsByType(hits: SearchHit[]): Record<SearchDocumentType, number> {
  const counts = Object.fromEntries(searchDocumentTypes.map((type) => [type, 0])) as Record<
    SearchDocumentType,
    number
  >;

  for (const hit of hits) {
    counts[hit.document.type] += 1;
  }

  return counts;
}

export function groupHitsByType(hits: SearchHit[]) {
  return searchDocumentTypes
    .map((type) => ({
      type,
      hits: hits.filter((hit) => hit.document.type === type),
    }))
    .filter((group) => group.hits.length > 0);
}

/**
 * Splits a title into matched/unmatched chunks for highlighting. Only exact
 * folded matches are highlighted — transliterated and fuzzy matches shift the
 * character offsets, so those titles are simply rendered unhighlighted.
 */
export function getSearchHighlightParts(
  title: string,
  query: string,
): Array<{ text: string; matched: boolean }> {
  const tokens = Array.from(
    new Set(
      buildQueryVariants(query)
        .flatMap((variant) => variant.split(' '))
        .filter((token) => token.length >= 2),
    ),
  ).sort((a, b) => b.length - a.length);

  if (tokens.length === 0) return [{ text: title, matched: false }];

  const foldedTitle = foldSearchText(title);
  // foldSearchText only lowercases and swaps separators for spaces, so offsets
  // line up with the original title as long as the lengths still match.
  if (foldedTitle.length !== title.length) return [{ text: title, matched: false }];

  const matched = new Array<boolean>(title.length).fill(false);

  for (const token of tokens) {
    let from = foldedTitle.indexOf(token);

    while (from !== -1) {
      for (let index = from; index < from + token.length; index += 1) {
        matched[index] = true;
      }
      from = foldedTitle.indexOf(token, from + token.length);
    }
  }

  const parts: Array<{ text: string; matched: boolean }> = [];

  for (let index = 0; index < title.length; index += 1) {
    const last = parts[parts.length - 1];

    if (last && last.matched === matched[index]) {
      last.text += title[index];
    } else {
      parts.push({ text: title[index], matched: matched[index] });
    }
  }

  return parts;
}
