import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const defaultCdnOrigin = 'https://cdn.foliart.me';
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).origin;
}

const cdnOrigin = normalizeOrigin(
  process.env.ASSET_PREFIX?.trim() || process.env.NEXT_PUBLIC_CDN_URL?.trim() || defaultCdnOrigin,
);
const cdnUrl = new URL(cdnOrigin);
const assetPrefix = process.env.ENABLE_ASSET_PREFIX === 'true' ? cdnOrigin : undefined;
const imageCdnEnabled = process.env.ENABLE_IMAGE_CDN === 'true';

const createConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const activeAssetPrefix = isDev ? undefined : assetPrefix;

  const nextConfig: NextConfig = {
    reactCompiler: true,
    output: 'standalone',
    assetPrefix: activeAssetPrefix,
    crossOrigin: activeAssetPrefix ? 'anonymous' : undefined,
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
      path: imageCdnEnabled && activeAssetPrefix ? `${activeAssetPrefix}/_next/image` : '/_next/image',
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'placehold.co',
        },
        {
          protocol: cdnUrl.protocol.replace(':', '') as 'http' | 'https',
          hostname: cdnUrl.hostname,
          port: cdnUrl.port,
          pathname: '/**',
        },
      ],
      formats: ['image/avif', 'image/webp'],
      minimumCacheTTL: 86400,
    },
  };

  return withNextIntl(nextConfig);
};

export default createConfig;
