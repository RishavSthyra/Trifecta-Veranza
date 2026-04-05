const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/dlhfbu3kh/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/dp7bxmquq/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        port: "",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sthyra.com",
        port: "",
        pathname: "/interior-panos-trifecta/**",
      },
    ],
  },
};

export default nextConfig;

