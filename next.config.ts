import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF primero (mejor compresión), WebP como fallback
    formats: ["image/avif", "image/webp"],
    // Calidades permitidas por el optimizador (75 por defecto, 90 para el
    // modal de detalle de carta, donde se necesita texto más nítido)
    qualities: [75, 90],
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
