import { describe, expect, it } from "vitest";
import {
  addInventoryWeight,
  listInventoryWeightsLb,
  nextHeavierInventoryWeight,
  normalizeWeightLb,
  removeInventoryWeight,
  sanitizeWeightInventory,
  visibleWeightInventoryKinds,
} from "@/lib/weightInventory";

describe("weightInventory", () => {
  it("normalizes weights to half-pound steps", () => {
    expect(normalizeWeightLb(15)).toBe(15);
    expect(normalizeWeightLb(2.5)).toBe(2.5);
    expect(normalizeWeightLb(12.4)).toBe(12.5);
    expect(normalizeWeightLb(0)).toBeNull();
    expect(normalizeWeightLb(-5)).toBeNull();
  });

  it("sanitizes unknown kinds and bad entries", () => {
    const cleaned = sanitizeWeightInventory({
      dumbbell: [{ weightLb: 15 }, { weightLb: -1 }, { weightLb: "x" }],
      cable: [{ weightLb: 50 }],
      kettlebell: "nope",
    });
    expect(cleaned).toEqual({ dumbbell: [{ weightLb: 15 }] });
  });

  it("dedupes denominations when adding", () => {
    let inv = addInventoryWeight({}, "dumbbell", 10);
    inv = addInventoryWeight(inv, "dumbbell", 10, 2);
    expect(listInventoryWeightsLb(inv, "dumbbell")).toEqual([10]);
    expect(inv.dumbbell?.[0]?.count).toBe(3);
  });

  it("removes a denomination and drops empty kinds", () => {
    let inv = addInventoryWeight({}, "barbell", 45);
    inv = removeInventoryWeight(inv, "barbell", 45);
    expect(inv.barbell).toBeUndefined();
  });

  it("finds the next heavier owned weight", () => {
    const inv = sanitizeWeightInventory({
      dumbbell: [{ weightLb: 5 }, { weightLb: 10 }, { weightLb: 20 }],
    });
    expect(nextHeavierInventoryWeight(inv, "dumbbell", 5)).toBe(10);
    expect(nextHeavierInventoryWeight(inv, "dumbbell", 20)).toBeNull();
  });

  it("only shows inventory for enabled equipment", () => {
    expect(
      visibleWeightInventoryKinds(["bodyweight", "dumbbell", "barbell"]),
    ).toEqual(["dumbbell", "barbell"]);
    expect(visibleWeightInventoryKinds(["bodyweight"])).toEqual([]);
  });
});
