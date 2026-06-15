import type { AuthMode } from "@/core";

/** Stable id for which auth context `loadSettings` last applied. */
export function settingsHydrationKey(
  mode: AuthMode,
  userId: string | null | undefined,
): string | null {
  if (mode === "loading") return null;
  if (mode === "authenticated") {
    return userId ? `user:${userId}` : null;
  }
  return mode;
}

/** True when persisted settings in the store belong to the current auth session. */
export function settingsHydrationMatchesAuth(
  mode: AuthMode,
  userId: string | null | undefined,
  hydratedForAuthKey: string | null,
): boolean {
  const expected = settingsHydrationKey(mode, userId);
  return expected != null && hydratedForAuthKey === expected;
}
