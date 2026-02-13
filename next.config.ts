import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Compression activée pour réduire la taille des assets
  compress: true,

  // Config Turbopack vide pour Next.js 16 (Turbopack enabled by default)
  // Code splitting est géré automatiquement par Turbopack
  turbopack: {},

  // Headers de cache agressifs pour les assets statiques
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
      {
        source: '/_next/static/:path*',
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

export default nextConfig;
