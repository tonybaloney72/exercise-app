import { describe, expect, it } from "vitest";
import { shouldPreserveStoredCustomWeekOnPrefsRefresh } from "@/lib/weekPlanPreferences";
import type { UserSettings } from "@/types";

describe("shouldPreserveStoredCustomWeekOnPrefsRefresh", () => {
  it("preserves manual custom weeks on prefs refresh", () => {
    const settings = {
      programMode: "custom",
      customBuildStyle: "manual",
    } as UserSettings;
    expect(
      shouldPreserveStoredCustomWeekOnPrefsRefresh(settings, "prefs", true),
    ).toBe(true);
  });

  it("regenerates guided custom weeks on prefs refresh", () => {
    const settings = {
      programMode: "custom",
      customBuildStyle: "guided",
    } as UserSettings;
    expect(
      shouldPreserveStoredCustomWeekOnPrefsRefresh(settings, "prefs", true),
    ).toBe(false);
  });

  it("always materializes on full refresh", () => {
    const settings = {
      programMode: "custom",
      customBuildStyle: "manual",
    } as UserSettings;
    expect(
      shouldPreserveStoredCustomWeekOnPrefsRefresh(settings, "full", true),
    ).toBe(false);
  });
});
