import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Everything a crawler either cannot render or must not spend its
        // budget on: the proxied backend, the endpoints only the admin panel
        // calls, the JSON index that client-side search downloads, the health
        // probe, the internal translation-diff tool, and the admin panel
        // itself — which answers an anonymous request with a login redirect.
        // `$` anchors the bare `/ru/admin` so the rule cannot also swallow an
        // article slug that merely starts with those letters.
        disallow: [
          '/api/',
          '/admin-api/',
          '/search-index/',
          '/healthz',
          '/lang',
          '/*/admin$',
          '/*/admin/',
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
    // No `host:` — Yandex dropped the directive in 2018 and it was never part
    // of RFC 9309. The canonical host is declared where every crawler reads
    // it: the 301 from `www` in nginx, plus `rel=canonical` on every page.
  };
}
