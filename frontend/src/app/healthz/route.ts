/**
 * Liveness probe for the container healthcheck.
 *
 * It deliberately touches nothing but the Next.js server itself: the previous
 * probe fetched `/ru/catalog`, so a backend outage made the frontend look
 * unhealthy and — under `restart: unless-stopped` — restarted it exactly when
 * it could still have been serving cached pages.
 *
 * It sits outside `[locale]` so `proxy.ts` (matcher: `/` and `/(ru|en|fr|es)/*`)
 * never rewrites or redirects it.
 */
export async function GET() {
  return new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export const HEAD = GET;
