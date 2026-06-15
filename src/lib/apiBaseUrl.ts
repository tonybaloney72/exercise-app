import { isCapacitorBundledBuild } from "@/lib/capacitorRuntime";

/**
 * Origin for same-origin fetches (`/api/*`).
 * Bundled Capacitor builds have no Next server — calls go to production (or override).
 */
export function resolveAppOrigin(): string {
  if (!isCapacitorBundledBuild()) return "";
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  return origin ? origin.replace(/\/$/, "") : "";
}

export function resolveApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = resolveAppOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
