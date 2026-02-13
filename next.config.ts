import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: 'f4.bcbits.com',
        pathname: '/img/**', // Changed from /img/a** to /img/**
        port: '',
        protocol: 'https',
      },
    ],
  }
};

export default nextConfig;
