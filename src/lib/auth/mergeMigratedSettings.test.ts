import { describe, expect, it } from "vitest";
import { mergeMigratedSettings } from "@/lib/auth/mergeMigratedSettings";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import type { UserSettings } from "@/types";

describe("mergeMigratedSettings", () => {
  it("never downgrades equipment onboarding when cloud is complete", () => {
    const cloud: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: true,
      darkMode: true,
    };
    const local: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: false,
    };
    expect(mergeMigratedSettings(cloud, local).equipmentOnboardingCompleted).toBe(
      true,
    );
  });

  it("promotes local onboarding completion when cloud row is new", () => {
    const cloud = { ...DEFAULT_SETTINGS };
    const local: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: true,
    };
    expect(mergeMigratedSettings(cloud, local).equipmentOnboardingCompleted).toBe(
      true,
    );
  });

  it("lets local prefs override cloud when guest customized", () => {
    const cloud: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: true,
      darkMode: false,
    };
    const local: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: false,
      darkMode: true,
    };
    const merged = mergeMigratedSettings(cloud, local);
    expect(merged.equipmentOnboardingCompleted).toBe(true);
    expect(merged.darkMode).toBe(true);
  });
});
