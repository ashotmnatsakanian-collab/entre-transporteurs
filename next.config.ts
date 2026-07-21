import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  webpack: (config) => {
    // Leaflet uses browser APIs — prevent SSR bundling
    config.resolve.fallback = { fs: false, net: false, tls: false }
    return config
  },
}

export default nextConfig
