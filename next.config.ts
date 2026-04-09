import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete 
    // even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // If you also want to skip TypeScript errors during build:
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
