import type { NextConfig } from "next";

process.env.TZ ??= "Africa/Cairo";

const nextConfig: NextConfig = {
  agentRules: false,
  output: process.env.NETLIFY ? undefined : "standalone",
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "exceljs",
    "nodemailer",
    "@node-rs/argon2",
  ],
  // Serverless bundles must include the PDF fonts and images read at runtime.
  outputFileTracingIncludes: {
    "/**/*": ["./src/pdf/**/*"],
  },
};

export default nextConfig;
