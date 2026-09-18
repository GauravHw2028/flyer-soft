import type { NextConfig } from "next";

// `cloudflare:workers` only exists inside the Workers runtime. Vercel builds
// resolve it to a stub, where bindings come from process.env instead.
const workersBinding = "./build/cloudflare-workers-stub.ts";

const nextConfig: NextConfig = {
  // Vinext probes multipart requests before routing them. Keep that limit
  // above the upload/export endpoints' own 8 MB / 18 MB limits.
  experimental: { serverActions: { bodySizeLimit: '20mb' } },
  turbopack: { resolveAlias: { "cloudflare:workers": workersBinding } },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "cloudflare:workers": workersBinding,
    };
    return config;
  },
};

export default nextConfig;
