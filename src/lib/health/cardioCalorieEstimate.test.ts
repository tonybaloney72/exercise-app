import { describe, expect, it } from "vitest";
import {
  estimateActiveCaloriesKcal,
  resolveActiveCaloriesForWrite,
} from "@/lib/health/cardioCalorieEstimate";

describe("cardioCalorieEstimate", () => {
  it("prefers HC calories when present", () => {
    expect(
      resolveActiveCaloriesForWrite({
        kind: "walk",
        durationSeconds: 1800,
        fromHealth: 142.6,
        weightLb: 180,
      }),
    ).toBe(143);
  });

  it("estimates from MET when HC has no sample", () => {
    const kcal = estimateActiveCaloriesKcal("jog", 1800, 180);
    expect(kcal).toBeGreaterThan(100);
    expect(kcal).toBeLessThan(500);
  });
});
