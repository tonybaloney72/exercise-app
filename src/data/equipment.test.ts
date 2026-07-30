import { describe, expect, it } from "vitest";
import { exerciseMatchesEquipment } from "@/data/equipment";

describe("exerciseMatchesEquipment", () => {
  it("matches when any load alternative is available", () => {
    expect(
      exerciseMatchesEquipment(
        ["bodyweight", "dumbbell", "kettlebell"],
        ["dumbbell"],
      ),
    ).toBe(true);
  });

  it("requires both load and bench when an exercise lists both", () => {
    expect(
      exerciseMatchesEquipment(["dumbbell", "bench"], ["dumbbell"]),
    ).toBe(false);
    expect(
      exerciseMatchesEquipment(["dumbbell", "bench"], ["bench"]),
    ).toBe(false);
    expect(
      exerciseMatchesEquipment(["dumbbell", "bench"], ["dumbbell", "bench"]),
    ).toBe(true);
  });

  it("allows either surface when only surfaces are listed", () => {
    expect(
      exerciseMatchesEquipment(["sturdy_chair", "bench"], ["bench"]),
    ).toBe(true);
    expect(
      exerciseMatchesEquipment(["sturdy_chair", "bench"], ["bodyweight"]),
    ).toBe(false);
  });

  it("requires a hang option when hang gear is listed", () => {
    expect(
      exerciseMatchesEquipment(["pull_up_bar", "rings"], ["bodyweight"]),
    ).toBe(false);
    expect(
      exerciseMatchesEquipment(["pull_up_bar", "rings"], ["rings"]),
    ).toBe(true);
  });

  it("requires surface even for bodyweight-on-bench moves", () => {
    expect(
      exerciseMatchesEquipment(["bodyweight", "bench"], ["bodyweight"]),
    ).toBe(false);
    expect(
      exerciseMatchesEquipment(["bodyweight", "bench"], [
        "bodyweight",
        "bench",
      ]),
    ).toBe(true);
  });
});
