import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
