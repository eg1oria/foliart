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
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://placehold.co",
  "font-src 'self' data:",
  "connect-src 'self'",
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
