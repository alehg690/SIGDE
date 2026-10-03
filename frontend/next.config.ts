import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

// Next.js loads frontend/.env automatically; the shared backend uses the root .env.
const sharedEnvPath = resolve(__dirname, "../.env");
if (existsSync(sharedEnvPath)) loadEnvFile(sharedEnvPath);

const isProduction = process.env.NODE_ENV === 'production';
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProduction ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
];

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === 'development' ? { allowedDevOrigins: ['127.0.0.1', '192.168.1.17'] } : {}),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
