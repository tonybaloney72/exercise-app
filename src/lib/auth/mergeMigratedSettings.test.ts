import { describe, expect, it } from "vitest";
import { mergeMigratedSettings } from "@/lib/auth/mergeMigratedSettings";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import type { UserSettings } from "@/types";

describe("mergeMigratedSettings", () => {
  it("never downgrades equipment onboarding when cloud is complete", () => {
    const cloud: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: true,
      themeMode: "dark",
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
      themeMode: "light",
    };
    const local: UserSettings = {
      ...DEFAULT_SETTINGS,
      equipmentOnboardingCompleted: false,
      themeMode: "dark",
    };
    const merged = mergeMigratedSettings(cloud, local);
    expect(merged.equipmentOnboardingCompleted).toBe(true);
    expect(merged.themeMode).toBe("dark");
  });
});
