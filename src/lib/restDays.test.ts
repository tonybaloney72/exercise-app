import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEKLY_REST_DAYS,
  resolveRestDayMode,
  sanitizeWeeklyRestDays,
} from "@/lib/restDays";

describe("restDays", () => {
  it("migrates legacy off/light/full values", () => {
    const days = sanitizeWeeklyRestDays({
      0: "off",
      1: "light",
      2: "full",
    });
    expect(days[0]).toBe("workout");
    expect(days[1]).toBe("stretches");
    expect(days[2]).toBe("full_rest");
    expect(days[3]).toBe("workout");
  });

  it("defaults Sunday to active recovery before user customization", () => {
    expect(DEFAULT_WEEKLY_REST_DAYS[0]).toBe("active_recovery");
    expect(resolveRestDayMode(0, {})).toBe("active_recovery");
    expect(resolveRestDayMode(1, {})).toBe("workout");
  });
});
