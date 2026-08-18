import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FiArrowRight, FiSearch } from 'react-icons/fi';
import HeroBreadcrumbs, { getBreadcrumbCopy } from '@/components/HeroBreadcrumbs';
import MediaImage from '@/components/catalog/MediaImage';
import SearchField from '@/components/search/SearchField';
import { Link } from '@/i18n/routing';
import { formatArticleDate } from '@/lib/articles';
import {
  countHitsByType,
  createSearchEntries,
  groupHitsByType,
  isSearchableQuery,
  normalizeSearchQuery,
  searchDocumentTypes,
  searchEntries,
  SEARCH_RESULTS_LIMIT,
  type SearchDocument,
  type SearchDocumentType,
  type SearchHit,
} from '@/lib/search';
import { getSearchIndex } from '@/lib/searchIndex';
import { buildBreadcrumbSchema, buildPageMetadata, stringifyJsonLd } from '@/lib/seo';

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function parseTypeFilter(value: string): SearchDocumentType | null {
  return searchDocumentTypes.includes(value as SearchDocumentType)
    ? (value as SearchDocumentType)
    : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: 'Search' });
  const query = normalizeSearchQuery(readParam(resolvedSearchParams.q));

  const metadata = buildPageMetadata({
    locale,
    path: '/search',
    title: query ? t('resultsFor', { query }) : t('pageTitle'),
    description: t('pageSubtitle'),
    image: '/catalog-head.webp',
  });

  return {
    ...metadata,
    // Result listings are endless permutations — only the hub page is indexable.
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: 'Search' });
  const breadcrumbCopy = getBreadcrumbCopy(locale);

  const query = normalizeSearchQuery(readParam(resolvedSearchParams.q));
  const typeFilter = parseTypeFilter(readParam(resolvedSearchParams.type));
  const hasQuery = isSearchableQuery(query);

  const { documents } = await getSearchIndex(locale);
  const allHits = hasQuery
    ? searchEntries(createSearchEntries(documents), query, { limit: SEARCH_RESULTS_LIMIT })
    : [];
  const counts = countHitsByType(allHits);
  const hits = typeFilter ? allHits.filter((hit) => hit.document.type === typeFilter) : allHits;
  const groups = groupHitsByType(hits);

  const categories = documents.filter((document) => document.type === 'category');
  const pages = documents.filter((document) => document.type === 'page');
  const articles = documents
    .filter((document) => document.type === 'article')
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 3);
  const calendars = documents.filter((document) => document.type === 'calendar').slice(0, 4);

  // The curated blocks are the answer when there is nothing to list yet.
  const showPreparedAnswers = !hasQuery || allHits.length === 0;

  const breadcrumbSchema = buildBreadcrumbSchema(locale, [
    { name: breadcrumbCopy.home, path: '/' },
    { name: t('breadcrumb'), path: '/search' },
  ]);

  const renderResultCard = (hit: SearchHit) => {
    const { document } = hit;

    return (
      <li key={document.id}>
        <Link
          href={document.href}
          className="group flex items-start gap-4 border border-[#0b5a45]/12 bg-white p-4 transition-colors hover:border-[#0b5a45]/40 md:gap-5 md:p-5">
          <span className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#eef3ef] md:h-24 md:w-24">
            <MediaImage
              src={document.image}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              emptyState={
                <span className="flex h-full w-full items-center justify-center text-[#0b5a45]">
                  <FiSearch size={20} aria-hidden="true" />
                </span>
              }
            />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#8b9a94]">
              <span className="bg-[#eef3ef] px-2 py-1 text-[#0b5a45]">
                {t(`badges.${document.type}`)}
              </span>
              {document.context ? <span>{document.context}</span> : null}
              {document.type === 'article' && document.date ? (
                <span>{formatArticleDate(document.date, locale)}</span>
              ) : null}
            </span>

            <span className="mt-2 block text-lg font-semibold text-[#10283d] transition-colors group-hover:text-[#0b5a45]">
              {document.title}
            </span>

            {document.description ? (
              <span className="mt-2 block text-sm leading-6 text-[#53646b] line-clamp-2">
                {document.description}
              </span>
            ) : null}
          </span>

          <FiArrowRight
            size={18}
            aria-hidden="true"
            className="mt-1 hidden shrink-0 text-[#8b9a94] transition-colors group-hover:text-[#0b5a45] md:block"
          />
        </Link>
      </li>
    );
  };

  const renderQuickCard = (document: SearchDocument) => (
    <li key={document.id}>
      <Link
        href={document.href}
        className="group flex h-full items-center gap-4 border border-[#0b5a45]/12 bg-white p-4 transition-colors hover:border-[#0b5a45]/40">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#eef3ef]">
          <MediaImage
            src={document.image}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            emptyState={
              <span className="flex h-full w-full items-center justify-center text-[#0b5a45]">
                <FiSearch size={16} aria-hidden="true" />
              </span>
            }
          />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-medium text-[#10283d] transition-colors group-hover:text-[#0b5a45]">
            {document.title}
          </span>
          {document.description ? (
            <span className="mt-1 block text-sm text-[#8b9a94] line-clamp-2">
              {document.description}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );

  return (
    <main className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbSchema) }}
      />

      {/* No `overflow-hidden` here: the suggestion dropdown has to escape the hero. */}
      <section className="catalog-header relative flex flex-col justify-center px-6 pb-14 pt-30 md:pb-20 md:pt-60">
        <Image
          src="/catalog-head.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        <div className="relative z-10 w-full">
          <div className="mb-3 md:mb-5">
            <HeroBreadcrumbs
              locale={locale}
              items={[{ label: t('breadcrumb'), href: '/search' }]}
            />
          </div>
          <h1 className="max-w-4xl text-3xl font-bold text-white md:text-5xl">{t('pageTitle')}</h1>
          <p className="mt-3 max-w-2xl text-base text-white/85 md:text-lg">{t('pageSubtitle')}</p>

          <div className="mt-6 max-w-3xl">
            <SearchField variant="page" initialQuery={query} />
          </div>
        </div>
      </section>

      {hasQuery ? (
        <section className="site-gutter pt-10 md:pt-14">
          <div className="flex flex-col gap-4 border-b border-[#0b5a45]/12 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#10283d] md:text-2xl">
                {t('resultsFor', { query })}
              </h2>
              <p className="mt-1 text-sm text-[#6f7d78]">
                {t('resultsCount', { count: allHits.length })}
              </p>
            </div>

            {allHits.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Link
                    href={{ pathname: '/search', query: { q: query } }}
                    aria-current={typeFilter ? undefined : 'true'}
                    className={`block border px-3 py-1.5 text-sm transition-colors ${
                      typeFilter
                        ? 'border-[#0b5a45]/20 text-[#10283d] hover:border-[#0b5a45]'
                        : 'border-[#074031] bg-[#074031] text-white'
                    }`}>
                    {t('filterAll')} · {allHits.length}
                  </Link>
                </li>
                {searchDocumentTypes
                  .filter((type) => counts[type] > 0)
                  .map((type) => (
                    <li key={type}>
                      <Link
                        href={{ pathname: '/search', query: { q: query, type } }}
                        aria-current={typeFilter === type ? 'true' : undefined}
                        className={`block border px-3 py-1.5 text-sm transition-colors ${
                          typeFilter === type
                            ? 'border-[#074031] bg-[#074031] text-white'
                            : 'border-[#0b5a45]/20 text-[#10283d] hover:border-[#0b5a45]'
                        }`}>
                        {t(`groups.${type}`)} · {counts[type]}
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>

          {hits.length === 0 ? (
            <div className="mt-8 border border-dashed border-[#0b5a45]/25 bg-[#f7f6f1] px-6 py-12 text-center">
              <p className="text-lg font-semibold text-[#10283d]">{t('empty')}</p>
              <p className="mt-2 text-sm text-[#5f726b]">{t('emptyHint')}</p>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-10">
              {groups.map((group) => (
                <div key={group.type}>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#8b9a94]">
                    {t(`groups.${group.type}`)}
                  </h3>
                  <ul className="flex flex-col gap-3">{group.hits.map(renderResultCard)}</ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="site-gutter pt-12 md:pt-16">
        {showPreparedAnswers && categories.length > 0 ? (
          <>
            <h2 className="text-xl font-semibold text-[#10283d] md:text-2xl">
              {t('popularTitle')}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={`chip-${category.id}`}>
                  <Link
                    href={{ pathname: '/search', query: { q: category.title } }}
                    className="block border border-[#0b5a45]/20 px-4 py-2 text-sm text-[#10283d] transition-colors hover:border-[#0b5a45] hover:text-[#0b5a45]">
                    {category.title}
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className="mt-12 text-xl font-semibold text-[#10283d] md:text-2xl">
              {t('categoriesTitle')}
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">{categories.map(renderQuickCard)}</ul>
          </>
        ) : null}

        {showPreparedAnswers && articles.length > 0 ? (
          <>
            <h2 className="mt-12 text-xl font-semibold text-[#10283d] md:text-2xl">
              {t('articlesTitle')}
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">{articles.map(renderQuickCard)}</ul>
          </>
        ) : null}

        {showPreparedAnswers && calendars.length > 0 ? (
          <>
            <h2 className="mt-12 text-xl font-semibold text-[#10283d] md:text-2xl">
              {t('calendarsTitle')}
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">{calendars.map(renderQuickCard)}</ul>
          </>
        ) : null}

        {showPreparedAnswers ? (
          <>
            <h2 className="mt-12 text-xl font-semibold text-[#10283d] md:text-2xl">
              {t('pagesTitle')}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {pages.map((page) => (
                <li key={page.id}>
                  <Link
                    href={page.href}
                    className="block border border-[#0b5a45]/20 px-4 py-2 text-sm text-[#10283d] transition-colors hover:border-[#0b5a45] hover:text-[#0b5a45]">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="mt-12 flex flex-col gap-4 border border-[#0b5a45]/12 bg-[#f7f6f1] px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="text-lg font-semibold text-[#10283d]">{t('helpTitle')}</p>
            <p className="mt-1 max-w-2xl text-sm text-[#5f726b]">{t('helpText')}</p>
          </div>
          <Link
            href="/contacts"
            className="inline-flex items-center justify-center gap-2 bg-[#074031] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0b5a45]">
            {t('helpAction')}
            <FiArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
