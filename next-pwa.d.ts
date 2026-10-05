declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface PWAOptions {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    buildExcludes?: RegExp[];
  }

  function withPWA(options: PWAOptions): (config: NextConfig) => NextConfig;

  export default withPWA;
}