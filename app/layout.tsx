import type { Metadata, Viewport } from "next";
import { VT323, Press_Start_2P } from "next/font/google";
import { Providers } from "@/lib/providers";
import "./globals.css";

const vt323 = VT323({
  subsets: ["latin"],
  variable: "--font-mono-pixel",
  display: "swap",
  weight: "400",
});

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Digimon Card Tournament Tracker",
  description: "Track your Digimon card tournaments, decks, and standings with friends",
};

export const viewport: Viewport = {
  themeColor: "#00b84a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${vt323.variable} ${pressStart.variable} h-full`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00b84a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Digimon TCG" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col crt-scanlines">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}