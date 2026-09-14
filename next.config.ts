import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext probes multipart requests before routing them. Keep that limit
  // above the upload/export endpoints' own 8 MB / 18 MB limits.
  experimental: { serverActions: { bodySizeLimit: '20mb' } },
};

export default nextConfig;
