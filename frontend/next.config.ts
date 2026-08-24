import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const isStandaloneBuild = process.env.NEXT_OUTPUT === 'standalone';
const isHttpsDeployment = (process.env.SITE_URL ?? '').startsWith('https://');
const isReactCompilerEnabled = process.env.NEXT_REACT_COMPILER !== 'false';
const maxAdminRequestBodySize = '44mb';
const isDevelopment = process.env.NODE_ENV === 'development';

// Nonce-based CSP would force every page into dynamic rendering and disable
// ISR, so the policy below is the static-friendly variant: `'unsafe-inline'`
// stays for the framework's inline bootstrap scripts and JSON-LD blocks, while
// every other fetch, form, frame and plugin origin is locked to this origin.
// That is what limits the blast radius if the rich-text sanitiser is ever
// bypassed — injected markup cannot pull in or exfiltrate to a foreign origin.
//
// Google AdSense auto ads are the one exception to the self-only rule above:
// the loader comes from googlesyndication.com, creatives are framed from
// doubleclick/googlesyndication and impressions are beaconed back to google.com.
const googleAdsOrigins = [
  'https://pagead2.googlesyndication.com',
  'https://*.googlesyndication.com',
  'https://*.googleadservices.com',
  'https://*.googletagservices.com',
  'https://adservice.google.com',
  'https://*.g.doubleclick.net',
  'https://*.doubleclick.net',
  'https://www.google.com',
  // Ad traffic quality (sodar) beacons and the Funding Choices consent
  // messages that AdSense injects for EU visitors.
  'https://*.adtrafficquality.google',
  'https://fundingchoicesmessages.google.com',
].join(' ');

// The contacts page embeds the Yandex map widget; it only ever needs to be
// framed, so the origin stays out of every other directive.
const yandexMapsOrigins = ['https://yandex.ru', 'https://*.yandex.ru'].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${googleAdsOrigins}${isDevelopment ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' ${googleAdsOrigins}`,
  `img-src 'self' blob: data: https://placehold.co ${googleAdsOrigins}`,
  `font-src 'self' data: ${googleAdsOrigins}`,
  `connect-src 'self' ${googleAdsOrigins}`,
  `frame-src 'self' ${googleAdsOrigins} ${yandexMapsOrigins}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttpsDeployment ? ['upgrade-insecure-requests'] : []),
].join('; ');

const createConfig = (): NextConfig => {
  const nextConfig: NextConfig = {
    reactCompiler: isReactCompilerEnabled,
    output: isStandaloneBuild ? 'standalone' : undefined,
    poweredByHeader: false,
    experimental: {
      // Calendar forms can contain four 5 MiB images, a 20 MiB PDF, and multipart metadata.
      proxyClientMaxBodySize: maxAdminRequestBodySize,
      serverActions: {
        bodySizeLimit: maxAdminRequestBodySize,
      },
    },
    // In production nginx terminates `/api/` and `/media/` in front of Next and
    // proxies them straight to the backend; these rewrites are what make the
    // very same client-side URLs work when Next is served on its own (local
    // dev, `next start`). Keeping them as pure proxies — rather than as route
    // handlers under `src/app/api` — means there is exactly one implementation
    // of every endpoint, and it lives in the backend.
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
        {
          source: '/media/:path*',
          destination: `${backendUrl}/images/:path*`,
        },
      ];
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'Content-Security-Policy', value: contentSecurityPolicy },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
            },
            ...(isHttpsDeployment
              ? [
                  {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=31536000; includeSubDomains',
                  },
                ]
              : []),
          ],
        },
      ];
    },
    images: {
      path: '/_next/image',
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'placehold.co',
        },
      ],
      formats: ['image/webp'],
      minimumCacheTTL: 604800,
    },
  };

  return withNextIntl(nextConfig);
};

export default createConfig;
