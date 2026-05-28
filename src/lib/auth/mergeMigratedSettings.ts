import { normalizeUserSettings } from "@/lib/normalizeUserSettings";
import { LOCAL_SETTINGS_KEY } from "@/lib/repos/local";
import type { UserSettings } from "@/types";

/**
 * Merge guest localStorage settings into cloud on first sign-in.
 * Cloud-only flags must never be downgraded by empty/default local snapshots.
 */
export function mergeMigratedSettings(
  cloud: UserSettings,
  local: UserSettings,
): UserSettings {
  return normalizeUserSettings({
    ...cloud,
    ...local,
    equipmentOnboardingCompleted:
      cloud.equipmentOnboardingCompleted || local.equipmentOnboardingCompleted,
  });
}

/** True when this browser profile has a stored guest settings blob. */
export function hasLocalStoredSettings(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LOCAL_SETTINGS_KEY) != null;
}
