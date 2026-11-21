import type { NextConfig } from "next";

process.env.TZ ??= "Africa/Cairo";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
};

export default nextConfig;
