'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FiClock, FiCornerDownLeft, FiSearch, FiX } from 'react-icons/fi';
import { useLocale, useTranslations } from 'next-intl';
import { getPathname, useRouter } from '@/i18n/routing';
import {
  getSearchHighlightParts,
  isSearchableQuery,
  normalizeSearchQuery,
  searchEntries,
  SEARCH_SUGGESTION_LIMIT,
  type SearchDocument,
  type SearchEntry,
} from '@/lib/search';
import {
  clearRecentSearches,
  getLoadedSearchEntries,
  loadSearchEntries,
  readRecentSearches,
  rememberRecentSearch,
} from '@/lib/searchClient';

type SearchFieldProps = {
  /** `overlay` shows recent searches and popular sections inside the dropdown. */
  variant?: 'overlay' | 'page';
  initialQuery?: string;
  autoFocus?: boolean;
  /** Called after a navigation is triggered, so the overlay can close itself. */
  onNavigate?: () => void;
};

const popularSuggestionsLimit = 4;

export default function SearchField({
  variant = 'overlay',
  initialQuery = '',
  autoFocus = false,
  onNavigate,
}: SearchFieldProps) {
  const t = useTranslations('Search');
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [entries, setEntries] = useState<SearchEntry[] | null>(() => getLoadedSearchEntries(locale));
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const [isOpen, setIsOpen] = useState(false);
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);

  // Re-seeds the field when the page renders another `?q=` with this instance.
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQuery(initialQuery);
    setHighlightedIndex(-1);
  }

  useEffect(() => {
    let isActive = true;

    loadSearchEntries(locale)
      .then((loaded) => {
        if (isActive) setEntries(loaded);
      })
      .catch(() => {
        if (isActive) setEntries([]);
      });

    return () => {
      isActive = false;
    };
  }, [locale]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const hits = useMemo(() => {
    if (!entries || !isSearchableQuery(query)) return [];
    return searchEntries(entries, query, { limit: SEARCH_SUGGESTION_LIMIT });
  }, [entries, query]);

  const popularDocuments = useMemo(() => {
    if (!entries) return [] as SearchDocument[];

    return entries
      .filter((entry) => entry.document.type === 'category')
      .slice(0, popularSuggestionsLimit)
      .map((entry) => entry.document);
  }, [entries]);

  // Hits shrink as the query grows, so the highlight is clamped, never stale.
  const activeIndex = highlightedIndex < hits.length ? highlightedIndex : -1;
  const hasQuery = isSearchableQuery(query);
  const isLoading = entries === null && hasQuery;
  const showDropdown =
    isOpen && (hasQuery || (variant === 'overlay' && (recentSearches.length > 0 || popularDocuments.length > 0)));

  const goToSearchPage = (rawQuery: string) => {
    const normalized = normalizeSearchQuery(rawQuery);
    if (!normalized) {
      inputRef.current?.focus();
      return;
    }

    setRecentSearches(rememberRecentSearch(normalized));
    setIsOpen(false);
    router.push({ pathname: '/search', query: { q: normalized } });
    onNavigate?.();
  };

  const goToDocument = (document: SearchDocument) => {
    setRecentSearches(rememberRecentSearch(query));
    setIsOpen(false);
    router.push(document.href);
    onNavigate?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (hits.length === 0) return;

      event.preventDefault();
      setIsOpen(true);

      const next = activeIndex + (event.key === 'ArrowDown' ? 1 : -1);
      // Stepping past either end returns to the plain query in the input.
      setHighlightedIndex(next < 0 ? hits.length - 1 : next >= hits.length ? -1 : next);
      return;
    }

    if (event.key === 'Escape' && activeIndex >= 0) {
      event.preventDefault();
      setHighlightedIndex(-1);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const activeHit = activeIndex >= 0 ? hits[activeIndex] : undefined;

    if (activeHit) {
      goToDocument(activeHit.document);
      return;
    }

    goToSearchPage(query);
  };

  const isOverlay = variant === 'overlay';
  // Without JS the browser submits this GET form to the localized search page.
  const formAction = getPathname({ href: '/search', locale });
  const activeOptionId = activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="search-field relative w-full">
      <form
        role="search"
        action={formAction}
        method="get"
        onSubmit={handleSubmit}
        className={`flex w-full items-center gap-2 border bg-white px-3 transition-colors ${
          isOverlay
            ? 'border-white/25 bg-white/95 py-1.5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] focus-within:border-white'
            : 'border-[#0b5a45]/25 py-1.5 focus-within:border-[#0b5a45]'
        }`}>
        <FiSearch aria-hidden="true" size={20} className="shrink-0 text-[#0b5a45]" />

        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          aria-label={t('pageTitle')}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          className="min-h-11 w-full bg-transparent text-base text-[#10283d] outline-none placeholder:text-[#8b9a94]"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('clearLabel')}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-[#8b9a94] transition-colors hover:text-[#0b5a45]">
            <FiX size={18} aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="submit"
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 bg-[#074031] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0b5a45]">
          <FiSearch size={16} aria-hidden="true" className="sm:hidden" />
          <span className="hidden sm:inline">{t('submitLabel')}</span>
        </button>
      </form>

      {showDropdown ? (
        <div
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-[min(60vh,28rem)] overflow-y-auto border border-[#0b5a45]/15 bg-white shadow-[0_24px_50px_-30px_rgba(0,0,0,0.75)]">
          {hasQuery ? (
            <>
              {isLoading ? (
                <p className="px-4 py-5 text-sm text-[#6f7d78]">{t('loading')}</p>
              ) : null}

              {!isLoading && hits.length === 0 ? (
                <div className="px-4 py-5">
                  <p className="text-sm font-medium text-[#10283d]">{t('empty')}</p>
                  <p className="mt-1 text-sm text-[#6f7d78]">{t('emptyHint')}</p>
                </div>
              ) : null}

              {hits.length > 0 ? (
                <ul id={listId} role="listbox" aria-label={t('suggestionsLabel')}>
                  {hits.map((hit, index) => {
                    const { document } = hit;
                    const isActive = index === activeIndex;

                    return (
                      <li key={document.id} role="none">
                        <button
                          type="button"
                          id={`${listId}-option-${index}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => goToDocument(document)}
                          className={`flex w-full cursor-pointer items-center gap-3 border-b border-[#0b5a45]/10 px-4 py-3 text-left transition-colors last:border-b-0 ${
                            isActive ? 'bg-[#eef3ef]' : 'bg-white hover:bg-[#f5f8f5]'
                          }`}>
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden bg-[#eef3ef]">
                            {document.image ? (
                              <Image
                                src={document.image}
                                alt=""
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[#0b5a45]">
                                <FiSearch size={16} aria-hidden="true" />
                              </span>
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.95rem] text-[#10283d]">
                              {getSearchHighlightParts(document.title, query).map((part, partIndex) =>
                                part.matched ? (
                                  <mark
                                    key={partIndex}
                                    className="bg-transparent font-semibold text-[#0b5a45]">
                                    {part.text}
                                  </mark>
                                ) : (
                                  <span key={partIndex}>{part.text}</span>
                                ),
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#8b9a94]">
                              {document.context
                                ? `${t(`badges.${document.type}`)} · ${document.context}`
                                : t(`badges.${document.type}`)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {!isLoading ? (
                <button
                  type="button"
                  onClick={() => goToSearchPage(query)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border-t border-[#0b5a45]/10 bg-[#f5f8f5] px-4 py-3 text-left text-sm font-medium text-[#0b5a45] transition-colors hover:bg-[#eef3ef]">
                  <span className="truncate">
                    {t('allResults', { query: normalizeSearchQuery(query) })}
                  </span>
                  <FiCornerDownLeft size={16} aria-hidden="true" className="shrink-0" />
                </button>
              ) : null}
            </>
          ) : (
            <div className="px-4 py-4">
              {recentSearches.length > 0 ? (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9a94]">
                      {t('recentTitle')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRecentSearches(clearRecentSearches())}
                      className="cursor-pointer text-xs text-[#8b9a94] underline-offset-2 transition-colors hover:text-[#0b5a45] hover:underline">
                      {t('recentClear')}
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => goToSearchPage(item)}
                          className="flex cursor-pointer items-center gap-1.5 border border-[#0b5a45]/20 px-3 py-1.5 text-sm text-[#10283d] transition-colors hover:border-[#0b5a45] hover:text-[#0b5a45]">
                          <FiClock size={13} aria-hidden="true" className="text-[#8b9a94]" />
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {popularDocuments.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9a94]">
                    {t('popularTitle')}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {popularDocuments.map((document) => (
                      <li key={document.id}>
                        <button
                          type="button"
                          onClick={() => goToDocument(document)}
                          className="cursor-pointer border border-[#0b5a45]/20 px-3 py-1.5 text-sm text-[#10283d] transition-colors hover:border-[#0b5a45] hover:text-[#0b5a45]">
                          {document.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
