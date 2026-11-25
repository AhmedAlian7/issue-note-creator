import type { NextConfig } from "next";

process.env.TZ ??= "Africa/Cairo";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: { proxyClientMaxBodySize: "12mb" },
  output: process.env.NETLIFY ? undefined : "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
        ],
      },
    ];
  },
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
