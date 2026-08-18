import { routing } from '@/i18n/routing';
import { getSearchIndex } from '@/lib/searchIndex';

/**
 * Assembled per request so a deploy never ships a stale (or empty) index: the
 * backend is unreachable during the Docker build, and the underlying API calls
 * are already served from the Next data cache, so this stays cheap.
 */
export const dynamic = 'force-dynamic';

/**
 * Serves the whole search index for one locale. It lives outside `/api/`
 * on purpose: in production nginx proxies `/api/` straight to the backend.
 */
export async function GET(_request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale } = await context.params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return Response.json({ message: 'Unknown locale' }, { status: 404 });
  }

  return Response.json(await getSearchIndex(locale), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
