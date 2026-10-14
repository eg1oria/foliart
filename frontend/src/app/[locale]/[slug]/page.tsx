import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SitePageFrame from '@/components/SitePageFrame';
import { ApiError, getSitePage } from '@/lib/api';
import { contentLocales, type ContentLocale } from '@/lib/contentLocales';
import { buildPageMetadata } from '@/lib/seo';
import { getSitePageFramePath, getSitePageHref, isSitePageSlug } from '@/lib/sitePages';

type Params = Promise<{ locale: string; slug: string }>;

// Every unknown `/<locale>/<anything>` lands here, bots included, so a value
// that cannot be a page address is turned away before the backend is asked.
async function loadSitePage(locale: string, slug: string) {
  if (!contentLocales.includes(locale as ContentLocale) || !isSitePageSlug(slug)) {
    return null;
  }

  try {
    return await getSitePage(slug, locale);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await loadSitePage(locale, slug);

  if (!page) {
    return {};
  }

  return buildPageMetadata({
    locale,
    path: getSitePageHref(page.slug),
    title: page.title,
    description: page.description,
    availableLocales: page.publishedLocales,
  });
}

export default async function SitePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const page = await loadSitePage(locale, slug);

  if (!page) {
    notFound();
  }

  const frame = (
    <SitePageFrame
      displayMode={page.displayMode}
      src={getSitePageFramePath(locale, page.slug)}
      title={page.title}
    />
  );

  if (page.displayMode === 'fullscreen') {
    return (
      <main>
        <h1 className="sr-only">{page.title}</h1>
        {frame}
      </main>
    );
  }

  // The site header is drawn in white over the top of every page, so the
  // pasted markup starts below a dark band that also carries the page title.
  return (
    <main>
      <div className="catalog-header flex flex-col justify-end bg-[#0e2438] px-6 pb-10 pt-30 md:pb-14 md:pt-60">
        <h1 className="text-3xl font-bold text-white md:text-5xl">{page.title}</h1>
      </div>
      {frame}
    </main>
  );
}
