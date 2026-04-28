import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');

const createConfig = (): NextConfig => {
  const nextConfig: NextConfig = {
    reactCompiler: true,
    output: 'standalone',
    experimental: {
      serverActions: {
        bodySizeLimit: '5mb',
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
    images: {
      path: '/_next/image',
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'placehold.co',
        },
      ],
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 86400,
    },
  };

  return withNextIntl(nextConfig);
};

export default createConfig;
