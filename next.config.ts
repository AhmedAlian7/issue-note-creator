import type { NextConfig } from "next";

process.env.TZ ??= "Africa/Cairo";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
