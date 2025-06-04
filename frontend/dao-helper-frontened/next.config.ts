import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    // Use BACKEND_URL if provided, otherwise fall back to NEXT_PUBLIC_API_URL or default
    const apiUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
    console.log(`API URL for rewrites: ${apiUrl}`);

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
