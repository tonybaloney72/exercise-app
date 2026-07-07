import type { NextConfig } from "next";
import { createRequire } from "module";
import packageJson from "./package.json";
import { resolveCapacitorDevOrigins } from "./capacitor-dev-origins.mjs";

const require = createRequire(import.meta.url);

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_BUILD_ID ??
  (process.env.NODE_ENV === "production" ? "unknown" : "development");

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  /** Android emulator / device WebViews load dev via a non-localhost hostname. */
  allowedDevOrigins: resolveCapacitorDevOrigins(),
  /** Faster dev/build: tree-shake barrel imports (recharts is already default-optimized). */
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },
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

function withOptionalBundleAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== "true") return config;
  const bundleAnalyzer = require("@next/bundle-analyzer") as (
    options: { enabled: boolean },
  ) => (config: NextConfig) => NextConfig;
  return bundleAnalyzer({ enabled: true })(config);
}

export default withOptionalBundleAnalyzer(nextConfig);
