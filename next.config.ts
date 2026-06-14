import type { NextConfig } from "next";
import packageJson from "./package.json";

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  (process.env.NODE_ENV === "production" ? "unknown" : "development");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
