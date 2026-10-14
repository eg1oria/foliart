import { ApiError, getSitePage } from '@/lib/api';
import { contentLocales, type ContentLocale } from '@/lib/contentLocales';
import { buildSitePageDocument, getSitePageFrameHeaders } from '@/lib/sitePageFrame';
import { isSitePageSlug } from '@/lib/sitePages';

type Context = { params: Promise<{ locale: string; slug: string }> };

function notFound() {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}

/**
 * The sandboxed document behind a page built in the admin. The public page at
 * `/<locale>/<slug>` frames it; see `lib/sitePageFrame.ts` for why the markup
 * lives here instead of in the page itself.
 */
export async function GET(_request: Request, context: Context) {
  const { locale, slug } = await context.params;

  if (!contentLocales.includes(locale as ContentLocale) || !isSitePageSlug(slug)) {
    return notFound();
  }

  try {
    const page = await getSitePage(slug, locale);
    const mode = page.displayMode === 'fullscreen' ? 'fullscreen' : 'embedded';

    return new Response(
      buildSitePageDocument(page.html, { lang: locale, mode, title: page.title }),
      { headers: getSitePageFrameHeaders(mode) },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return notFound();
    }

    throw error;
  }
}
