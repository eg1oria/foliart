import { getAdminSession } from '@/lib/adminAuthServer';
import { canViewSection } from '@/lib/adminPermissions';
import { normalizeContentLocale } from '@/lib/contentLocales';
import { buildSitePageDocument, getSitePageFrameHeaders } from '@/lib/sitePageFrame';
import { maxSitePageHtmlBytes } from '@/lib/sitePages';

function plain(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}

/**
 * The editor's preview: the admin form posts the unsaved HTML into the preview
 * iframe, and it comes back under the very sandbox the public frame uses, so
 * the preview behaves like the published page — external CDNs included.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session || !canViewSection(session, 'site-pages')) {
    return plain('Unauthorized', 401);
  }

  const formData = await request.formData().catch(() => null);
  const html = formData?.get('html');

  if (typeof html !== 'string') {
    return plain('HTML is required', 400);
  }

  if (Buffer.byteLength(html, 'utf8') > maxSitePageHtmlBytes) {
    return plain('HTML must be no larger than 2 MB', 413);
  }

  const title = formData?.get('title');

  return new Response(
    buildSitePageDocument(html, {
      lang: normalizeContentLocale(String(formData?.get('locale') ?? '')),
      mode: 'preview',
      title: typeof title === 'string' ? title : '',
    }),
    { headers: { ...getSitePageFrameHeaders('preview'), 'Cache-Control': 'no-store' } },
  );
}
