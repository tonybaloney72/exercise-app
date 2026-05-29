import { describe, expect, it } from "vitest";
import {
  regenDayIndicesForPrefsChange,
  shouldRegenDayOfWeek,
} from "@/lib/weekBlueprintRegen";

describe("weekBlueprintRegen", () => {
  it("shouldRegenDayOfWeek matches regenDayIndicesForPrefsChange", () => {
    const freezeToday = true;
    const today = 3;
    const indices = regenDayIndicesForPrefsChange({
      todayDayOfWeek: today,
      freezeTodayPlan: freezeToday,
    });
    for (let dow = 0; dow < 7; dow++) {
      expect(shouldRegenDayOfWeek(dow, today, freezeToday)).toBe(
        indices.includes(dow),
      );
    }
  });

  it("includes today when not frozen", () => {
    expect(shouldRegenDayOfWeek(2, 2, false)).toBe(true);
    expect(shouldRegenDayOfWeek(1, 2, false)).toBe(false);
  });
});
