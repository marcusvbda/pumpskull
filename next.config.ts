import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Phones open the dev server through the computer's LAN IP; Next blocks those origins unless listed (dev only).
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
