import { describe, expect, it } from "vitest";
import {
  COOL_DOWN_CATALOG_POOLS,
  WARM_UP_CATALOG_POOLS,
} from "@/lib/stretchCatalogPools";

describe("stretch catalog pools", () => {
  it("includes the full SW library across themed pools", () => {
    const total = Object.values(WARM_UP_CATALOG_POOLS).reduce(
      (n, pool) => n + pool.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(39);
  });

  it("includes the full SC library across themed pools", () => {
    const total = Object.values(COOL_DOWN_CATALOG_POOLS).reduce(
      (n, pool) => n + pool.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(20);
  });

  it("places lower-body warm-ups in the lower pool", () => {
    const ids = WARM_UP_CATALOG_POOLS.lower.map((e) => e.exerciseId);
    expect(ids).toContain("SW-11");
    expect(ids).toContain("SW-12");
  });
});
