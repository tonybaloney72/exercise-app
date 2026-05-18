import { describe, expect, it } from "vitest";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  categoriesForDayLayout,
  groupsForCatalogDay,
  layoutEqual,
  suggestLayoutFromCatalog,
  weeklyCategoryLayoutFingerprint,
} from "@/lib/weeklyCategoryLayout";

describe("weeklyCategoryLayout", () => {
  it("suggestLayoutFromCatalog derives groups per day", () => {
    const layout = suggestLayoutFromCatalog();
    const mon = getCatalogPlanForDay(1);
    expect(layout[1]).toEqual(groupsForCatalogDay(mon));
    expect(layout[1]?.length).toBeGreaterThan(0);
  });

  it("categoriesForDayLayout respects rest and jog", () => {
    const tue = getCatalogPlanForDay(2);
    expect(categoriesForDayLayout(tue, [])).toEqual([]);
    const withLower = categoriesForDayLayout(tue, ["lower", "cardio"]);
    expect(withLower).toContain("LB");
    if (tue.hasJog) expect(withLower).toContain("PC");
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
