import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF primero (mejor compresión), WebP como fallback
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.digimoncard.io",
      },
      {
        protocol: "https",
        hostname: "digimoncard.io",
      },
    ],
  },
  turbopack: {},
};

export default nextConfig;
