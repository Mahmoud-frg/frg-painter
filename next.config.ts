import withPWA from 'next-pwa';
import type { NextConfig } from 'next';

// Base config
const baseConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

// Export a function-based config (required for Next.js 13+ with plugins like next-pwa)
const config = (
  _phase: string,
  { defaultConfig }: { defaultConfig: NextConfig }
) => {
  return withPWA({
    ...defaultConfig,
    ...baseConfig,
    pwa: {
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
    },
  });
};

export default config;
