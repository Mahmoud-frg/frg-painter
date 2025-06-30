declare module 'next-pwa' {
  import { NextConfig } from 'next';
  const withPWA: (
    config: NextConfig & { pwa: Record<string, any> }
  ) => NextConfig;
  export default withPWA;
}
