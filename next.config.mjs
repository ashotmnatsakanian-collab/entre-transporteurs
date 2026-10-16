/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permet de compiler dans un dossier séparé sans toucher à une instance déjà lancée
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    return config
  },
}

export default nextConfig
