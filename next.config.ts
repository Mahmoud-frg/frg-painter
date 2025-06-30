import withPWA from 'next-pwa';
import type { NextConfig } from 'next';

// Base config
const baseConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

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

      // ✅ Add this section
      fallbacks: {
        document: '/offline.html',
      },
    },
  });
};

export default config;
