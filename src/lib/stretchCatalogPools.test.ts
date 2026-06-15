import { describe, expect, it } from "vitest";
import { exercises } from "@/core/catalog";
import {
  COOL_DOWN_CATALOG_POOLS,
  themePoolForStretch,
  WARM_SESSION_CATALOG_POOLS,
  WARM_UP_CATALOG_POOLS,
} from "@/lib/stretchCatalogPools";

describe("stretchCatalogPools", () => {
  it("every SW and SC entry has secondaryCategory", () => {
    const stretches = exercises.filter(
      (e) => e.category === "SW" || e.category === "SC",
    );
    expect(stretches.length).toBeGreaterThan(50);
    for (const ex of stretches) {
      expect(
        ex.secondaryCategory,
        `${ex.id} ${ex.name} missing secondaryCategory`,
      ).toBeDefined();
    }
  });

  it("places all warm-ups in themed pools with no orphans", () => {
    const warmCount = Object.values(WARM_UP_CATALOG_POOLS).reduce(
      (n, pool) => n + pool.length,
      0,
    );
    const swCount = exercises.filter((e) => e.category === "SW").length;
    expect(warmCount).toBe(swCount);
  });

  it("places all cool-downs in themed pools with no orphans", () => {
    const coolCount = Object.values(COOL_DOWN_CATALOG_POOLS).reduce(
      (n, pool) => n + pool.length,
      0,
    );
    const scCount = exercises.filter((e) => e.category === "SC").length;
    expect(coolCount).toBe(scCount);
  });

  it("merges SW and SC into warm session pools per theme", () => {
    const core = WARM_SESSION_CATALOG_POOLS.core.map((e) => e.exerciseId);
    expect(core).toContain("SW-4");
    expect(core).toContain("SC-15");
    expect(core.length).toBeGreaterThan(WARM_UP_CATALOG_POOLS.core.length);
  });

  it("includes workout crossovers in warm session pools (no duplicate SW rows)", () => {
    const conditioning = WARM_SESSION_CATALOG_POOLS.conditioning.map(
      (e) => e.exerciseId,
    );
    const core = WARM_SESSION_CATALOG_POOLS.core.map((e) => e.exerciseId);
    expect(conditioning).toContain("PC-1");
    expect(core).toContain("CS-3");
    expect(conditioning).not.toContain("SW-44");
    expect(core).not.toContain("SW-52");
  });

  it("maps known stretches to expected pools", () => {
    const armCircles = exercises.find((e) => e.id === "SW-1")!;
    expect(themePoolForStretch(armCircles)).toBe("upper");
    const worldsGreatest = exercises.find((e) => e.id === "SW-16")!;
    expect(themePoolForStretch(worldsGreatest)).toBe("lower");
  });
});
