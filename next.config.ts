import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* CoinGecko has moved logo hosting once already; allowing both the
       current and legacy hosts avoids a dead image the day they do it
       again. Served unoptimized, so this is a permission list only. */
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },
};

export default nextConfig;
