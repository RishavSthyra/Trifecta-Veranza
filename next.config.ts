import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/dlhfbu3kh/image/upload/**',
      },
    ],
  },
};

export default nextConfig;
