import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow all image domains for now (can restrict later)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Ignore TypeScript errors during build (remove in production)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors during build (remove in production)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig