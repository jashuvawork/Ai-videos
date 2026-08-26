import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output breaks Vercel deploys (missing next-server.js.nft.json).
  // Railway uses Dockerfile.railway with `next start` and a full .next copy.
};

export default nextConfig;
