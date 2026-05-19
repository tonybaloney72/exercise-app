import { describe, expect, it } from "vitest";
import { exerciseMap } from "@/data/exercises";
import { exerciseMatchesEquipment } from "@/data/equipment";

describe("hybrid equipment tags", () => {
  const bodyweightOnly = ["bodyweight"] as const;

  it("gates anchored / ring moves off bodyweight-only plans", () => {
    for (const id of [
      "HC-127",
      "HC-135",
      "HC-138",
      "HC-139",
      "HC-213",
      "HC-217",
      "HC-231",
      "HC-239",
      "HC-249",
      "HC-269",
    ]) {
      const ex = exerciseMap[id];
      expect(ex, id).toBeDefined();
      expect(
        exerciseMatchesEquipment(ex!.equipment, [...bodyweightOnly]),
        id,
      ).toBe(false);
    }
  });

  it("keeps hamstring slide and wall-slide available bodyweight-only", () => {
    for (const id of ["HC-183", "HC-272"]) {
      const ex = exerciseMap[id]!;
      expect(ex.equipment).toEqual(["bodyweight"]);
      expect(exerciseMatchesEquipment(ex.equipment, [...bodyweightOnly])).toBe(
        true,
      );
    }
  });

  it("tags rings overhead triceps as rings", () => {
    expect(exerciseMap["HC-239"]!.equipment).toEqual(["rings"]);
  });

  it("tags pelican curl as rings", () => {
    expect(exerciseMap["HC-217"]!.name).toBe("Pelican Curl");
    expect(exerciseMap["HC-217"]!.equipment).toEqual(["rings"]);
  });

  it("tags dips as pull-up bar or bench/chair", () => {
    expect(exerciseMap["HC-138"]!.equipment).toEqual([
      "pull_up_bar",
      "plyo_box",
    ]);
  });

  it("tags upside down shrug as hang or bench/chair, not bodyweight-only", () => {
    expect(exerciseMap["HC-269"]!.equipment).toEqual([
      "pull_up_bar",
      "rings",
      "plyo_box",
    ]);
  });

  it("gates catalog resistance band rows off bodyweight-only", () => {
    for (const id of ["UPL-2", "UPL-4"]) {
      const ex = exerciseMap[id]!;
      expect(ex.equipment).toEqual(["resistance_band"]);
      expect(exerciseMatchesEquipment(ex.equipment, [...bodyweightOnly])).toBe(
        false,
      );
    }
  });
});
