import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  categoriesForDayLayout,
  groupsForCatalogDay,
  layoutEqual,
  sanitizeProgramMode,
  sanitizeWeeklyCategoryLayout,
  suggestLayoutFromCatalog,
  weeklyCategoryLayoutFingerprint,
} from "@/lib/weeklyCategoryLayout";

describe("weeklyCategoryLayout", () => {
  it("sanitizeProgramMode maps legacy priorities to preset", () => {
    expect(sanitizeProgramMode("priorities")).toBe("preset");
    expect(sanitizeProgramMode("preset")).toBe("preset");
    expect(sanitizeProgramMode(undefined)).toBe("preset");
  });

  it("suggestLayoutFromCatalog derives layout groups per day", () => {
    const layout = suggestLayoutFromCatalog();
    const mon = getCatalogPlanForDay(1);
    expect(layout[1]).toEqual(groupsForCatalogDay(mon));
    expect(layout[1]).toContain("core_front");
    expect(layout[1]).toContain("core_lower");
    expect(layout[1]).not.toContain("core");
  });

  it("categoriesForDayLayout respects rest and jog", () => {
    const tue = getCatalogPlanForDay(2);
    expect(categoriesForDayLayout(tue, [])).toEqual([]);
    const withLower = categoriesForDayLayout(tue, ["lower", "cardio"]);
    expect(withLower).toContain("LB");
    if (tue.hasJog) expect(withLower).toContain("PC");
  });

  it("categoriesForDayLayout uses only selected core subdivisions", () => {
    const mon = getCatalogPlanForDay(1);
    const cats = categoriesForDayLayout(mon, [
      "upper_push",
      "core_front",
    ]);
    expect(cats).toEqual(["UP", "CF"]);
  });

  it("sanitizeWeeklyCategoryLayout expands legacy core per catalog day", () => {
    const monCatalog = groupsForCatalogDay(getCatalogPlanForDay(1));
    const sanitized = sanitizeWeeklyCategoryLayout({
      1: ["core", "upper_push"],
    });
    expect(sanitized[1]).toContain("upper_push");
    for (const g of monCatalog) {
      if (g.startsWith("core_")) expect(sanitized[1]).toContain(g);
    }
    expect(sanitized[1]?.filter((g) => g.startsWith("core_"))).toEqual(
      monCatalog.filter((g) => g.startsWith("core_")),
    );
  });

  it("fingerprint changes when a day toggles", () => {
    const base = suggestLayoutFromCatalog();
    const fp1 = weeklyCategoryLayoutFingerprint(base);
    const edited = { ...base, 0: [] };
    const fp2 = weeklyCategoryLayoutFingerprint(edited);
    expect(fp1).not.toBe(fp2);
    expect(layoutEqual(base, { ...base })).toBe(true);
  });
});
