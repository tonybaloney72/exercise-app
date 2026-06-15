import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import packageJson from "./package.json";
import { resolveCapacitorDevOrigins } from "./capacitor-dev-origins.mjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  (process.env.NODE_ENV === "production" ? "unknown" : "development");

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  /** Android emulator / device WebViews load dev via a non-localhost hostname. */
  allowedDevOrigins: resolveCapacitorDevOrigins(),
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    ...(isCapacitorBuild
      ? {
          NEXT_PUBLIC_CAPACITOR: "1",
          NEXT_PUBLIC_API_ORIGIN:
            process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://myexercise.dev",
        }
      : {}),
  },
  ...(isCapacitorBuild
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default withBundleAnalyzer(nextConfig);
