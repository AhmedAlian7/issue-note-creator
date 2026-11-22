import type { NextConfig } from "next";

process.env.TZ ??= "Africa/Cairo";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "pg-boss",
    "exceljs",
    "nodemailer",
  ],
};

export default nextConfig;
