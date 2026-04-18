const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dlhfbu3kh/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dp7bxmquq/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        pathname: "/AADHYA%20SERENE/images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        pathname: "/interior-panos-trifecta/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        pathname: "/interior-pano-trifecta-new/**",
      },

      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        pathname: "/bareshell-pano-trifecta-new/**",
      },
    ],
  },
};

export default nextConfig;
