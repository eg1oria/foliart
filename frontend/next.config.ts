import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const assetPrefix =
  process.env.ENABLE_ASSET_PREFIX === 'true' && process.env.ASSET_PREFIX?.trim()
    ? process.env.ASSET_PREFIX.trim().replace(/\/$/, '')
    : undefined;

const createConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  const nextConfig: NextConfig = {
    reactCompiler: true,
    output: 'standalone',
    assetPrefix: isDev ? undefined : assetPrefix,
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
      remotePatterns: [{ hostname: 'placehold.co' }],
    },
  };

  return withNextIntl(nextConfig);
};

export default createConfig;
