import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const isStandaloneBuild = process.env.NEXT_OUTPUT === 'standalone';
const isHttpsDeployment = (process.env.SITE_URL ?? '').startsWith('https://');
const isReactCompilerEnabled = process.env.NEXT_REACT_COMPILER !== 'false';

const createConfig = (): NextConfig => {
  const nextConfig: NextConfig = {
    reactCompiler: isReactCompilerEnabled,
    output: isStandaloneBuild ? 'standalone' : undefined,
    poweredByHeader: false,
    experimental: {
      serverActions: {
        // Two product images can be submitted together, each limited to 5 MB.
        bodySizeLimit: '11mb',
      },
    },
    async rewrites() {
      return [
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
