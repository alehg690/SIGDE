import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

// Next.js loads frontend/.env automatically; the shared backend uses the root .env.
const sharedEnvPath = resolve(__dirname, "../.env");
if (existsSync(sharedEnvPath)) loadEnvFile(sharedEnvPath);

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['127.0.0.1', '192.168.1.17'],
};

export default nextConfig;
