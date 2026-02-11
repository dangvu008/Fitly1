import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Next.js 16: dùng proxy thay vì middleware export default
  experimental: {
    proxy: true,
  },
  // metadataBase để tránh cảnh báo OpenGraph
  metadataBase: new URL('http://localhost:3000'),
};

export default withNextIntl(nextConfig);