import { clientTrace, type TraceLevel } from "@/lib/diagnostics/clientTrace";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import type { UserSettings } from "@/types";

/** Short, non-identifying user id prefix for diagnostic logs. */
export function settingsTraceUserPrefix(
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  return userId.slice(0, 8);
}

/** Compact fingerprint of settings useful when diagnosing unexpected resets. */
export function settingsTraceFingerprint(
  settings: UserSettings,
): Record<string, unknown> {
  return {
    equipmentOnboardingCompleted: settings.equipmentOnboardingCompleted,
    availableEquipmentCount: settings.availableEquipment.length,
    availableEquipmentLooksDefault:
      settings.availableEquipment.length ===
        DEFAULT_SETTINGS.availableEquipment.length &&
      settings.availableEquipment.every((eq) =>
        DEFAULT_SETTINGS.availableEquipment.includes(eq),
      ),
    themeMode: settings.themeMode,
    programMode: settings.programMode,
    looksLikeFactoryDefaults:
      settings.equipmentOnboardingCompleted ===
        DEFAULT_SETTINGS.equipmentOnboardingCompleted &&
      settings.availableEquipment.length ===
        DEFAULT_SETTINGS.availableEquipment.length &&
      settings.themeMode === DEFAULT_SETTINGS.themeMode &&
      settings.programMode === DEFAULT_SETTINGS.programMode,
  };
}

export function traceSettingsEvent(
  event: string,
  data?: Record<string, unknown>,
  level: TraceLevel = "info",
): void {
  clientTrace("settings", event, data, level);
}
