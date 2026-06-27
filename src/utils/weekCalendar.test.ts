import { describe, expect, it } from "vitest";
import {
  weekAnchorFromDateKey,
  weekKeyFromDateKey,
} from "@/utils/weekCalendar";

describe("weekCalendar", () => {
  it("returns the Sunday week key for a date in that week", () => {
    expect(weekKeyFromDateKey("2026-05-16")).toBe("2026-05-10");
    const anchor = weekAnchorFromDateKey("2026-05-16");
    expect(anchor?.weekKey).toBe("2026-05-10");
    expect(anchor?.parsed.getDay()).toBe(6);
  });
});
