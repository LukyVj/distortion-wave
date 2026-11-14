import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the library itself comes from the parent folder (file:..), so the root covers the repo
  turbopack: { root: path.join(__dirname, "..") },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
