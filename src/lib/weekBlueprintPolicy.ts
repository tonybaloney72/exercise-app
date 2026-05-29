import type { UserSettings } from "@/types";

export function isGuidedCustomSettings(
  settings: Pick<UserSettings, "programMode" | "customBuildStyle">,
): boolean {
  return (
    settings.programMode === "custom" && settings.customBuildStyle === "guided"
  );
}

export function isManualCustomSettings(
  settings: Pick<UserSettings, "programMode" | "customBuildStyle">,
): boolean {
  return (
    settings.programMode === "custom" && settings.customBuildStyle === "manual"
  );
}
