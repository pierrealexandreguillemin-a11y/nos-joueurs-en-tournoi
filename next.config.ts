import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Compression activée pour réduire la taille des assets
  compress: true,

  // Config Turbopack vide pour Next.js 16 (Turbopack enabled by default)
  // Code splitting est géré automatiquement par Turbopack
  turbopack: {},

  // Cache headers for image assets (/_next/static cache is in vercel.json)
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
