import { describe, expect, it } from "vitest";
import {
  parseLocalDateKey,
  weekAnchorFromDateKey,
  weekKeyFromDateKey,
} from "@/utils/weekCalendar";

describe("weekCalendar", () => {
  it("parses valid local date keys and rejects invalid ones", () => {
    const parsed = parseLocalDateKey("2026-05-16");
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(4);
    expect(parsed!.getDate()).toBe(16);

    expect(parseLocalDateKey("2026-13-01")).toBeNull();
    expect(parseLocalDateKey("not-a-date")).toBeNull();
  });

  it("returns the Sunday week key for a date in that week", () => {
    expect(weekKeyFromDateKey("2026-05-16")).toBe("2026-05-10");
    const anchor = weekAnchorFromDateKey("2026-05-16");
    expect(anchor?.weekKey).toBe("2026-05-10");
    expect(anchor?.parsed.getDay()).toBe(6);
  });
});
