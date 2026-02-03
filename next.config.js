/** @type {import('next').NextConfig} */
const nextConfig = {
  // Uncomment the line below for cPanel deployment (creates standalone build)
  // output: 'standalone',
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
