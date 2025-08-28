import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"], 
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        hostname: 'nktmwrpvdlaenivtgqpm.supabase.co',
      },
    ],
  },
};

export default nextConfig;
