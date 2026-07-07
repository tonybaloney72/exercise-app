import { describe, expect, it } from "vitest";
import {
  displayHealthSourceName,
  formatHealthSourceDisplayName,
  looksLikePackageName,
  normalizeHealthSourceDisplayName,
} from "@/lib/health/healthSourceDisplayName";

describe("healthSourceDisplayName", () => {
  it("detects android package names", () => {
    expect(looksLikePackageName("com.nothing.smartcenter")).toBe(true);
    expect(looksLikePackageName("Samsung Health")).toBe(false);
    expect(looksLikePackageName("Nothing Watch 2")).toBe(false);
  });

  it("maps known Health Connect writer packages", () => {
    expect(
      formatHealthSourceDisplayName({
        sourceId: "com.nothing.smartcenter",
        sourceName: "com.nothing.smartcenter",
      }),
    ).toBe("Nothing Watch");
    expect(
      formatHealthSourceDisplayName({
        sourceId: "com.sec.android.app.shealth",
      }),
    ).toBe("Samsung Health");
  });

  it("prefers human device labels over package ids", () => {
    expect(
      formatHealthSourceDisplayName({
        sourceId: "com.google.android.apps.fitness",
        sourceName: "Pixel Watch 2",
      }),
    ).toBe("Pixel Watch 2");
  });

  it("guesses readable labels for unknown packages", () => {
    expect(
      formatHealthSourceDisplayName({
        sourceId: "com.example.runner",
      }),
    ).toBe("Example");
  });

  it("normalizes legacy stored package names for display", () => {
    expect(displayHealthSourceName("com.nothing.smartcenter")).toBe(
      "Nothing Watch",
    );
    expect(displayHealthSourceName("Samsung Galaxy Watch 6")).toBe(
      "Samsung Galaxy Watch 6",
    );
  });

  it("normalizeHealthSourceDisplayName returns undefined when empty", () => {
    expect(normalizeHealthSourceDisplayName({})).toBeUndefined();
    expect(
      normalizeHealthSourceDisplayName({
        sourceId: "com.nothing.smartcenter",
        sourceName: "com.nothing.smartcenter",
      }),
    ).toBe("Nothing Watch");
  });
});
