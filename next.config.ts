import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    contentDispositionType: "inline",
  },
};

export default nextConfig;
