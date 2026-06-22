import { describe, expect, it } from "vitest";
import {
  equipmentAuditMismatch,
  expectedEquipmentForExercise,
  expectedEquipmentFromName,
  isAbBicycleExerciseName,
  isCyclingEquipmentName,
} from "./equipment-heuristic.mjs";

describe("equipment-heuristic", () => {
  it("treats core bicycle moves as bodyweight, not bicycle implement", () => {
    expect(isAbBicycleExerciseName("Bicycle")).toBe(true);
    expect(isAbBicycleExerciseName("Straight Leg Bicycle")).toBe(true);
    expect(isAbBicycleExerciseName("Bicycle Crunch")).toBe(true);
    expect(expectedEquipmentFromName("Bicycle")).toEqual(["bodyweight"]);
    expect(expectedEquipmentFromName("Straight Leg Bicycle")).toEqual([
      "bodyweight",
    ]);
  });

  it("still flags real bike exercises", () => {
    expect(isCyclingEquipmentName("Stationary Bike")).toBe(true);
    expect(expectedEquipmentFromName("Stationary Bike")).toEqual(["bicycle"]);
    expect(expectedEquipmentFromName("Indoor Cycle")).toEqual(["bicycle"]);
  });

  it("infers dumbbell/kettlebell for Turkish Sit-Up (CF-12)", () => {
    expect(
      expectedEquipmentForExercise({
        name: "Turkish Sit-Up",
        notes: "Roll up from side-lying through seated to tall.",
      }),
    ).toEqual(["dumbbell", "kettlebell"]);
    expect(
      equipmentAuditMismatch(["dumbbell", "kettlebell"], [
        "dumbbell",
        "kettlebell",
      ]),
    ).toBe(false);
    expect(equipmentAuditMismatch(["dumbbell", "kettlebell"], ["bodyweight"])).toBe(
      false,
    );
  });

  it("allows OR-style equipment lists (overlap, not exact match)", () => {
    expect(
      equipmentAuditMismatch(["dumbbell"], ["dumbbell", "kettlebell"]),
    ).toBe(false);
  });

  it("does not flag when catalog has gear but heuristic defaulted to bodyweight (CF-16)", () => {
    expect(
      expectedEquipmentForExercise({
        name: "Roman Chair Side Crunch",
        notes:
          "Side-lying on bench or roman chair, crunch obliques toward hip; use pad or bench for support.",
      }),
    ).toEqual(["machine"]);
    expect(equipmentAuditMismatch(["machine"], ["bodyweight"])).toBe(false);
    expect(equipmentAuditMismatch(["machine"], ["machine"])).toBe(false);
  });

  it("still flags when catalog is bodyweight-only but heuristic expects implements", () => {
    expect(equipmentAuditMismatch(["bodyweight"], ["dumbbell"])).toBe(true);
  });

  it("treats dumbbell and kettlebell as interchangeable", () => {
    expect(equipmentAuditMismatch(["dumbbell"], ["kettlebell"])).toBe(false);
    expect(
      equipmentAuditMismatch(["dumbbell"], ["barbell", "kettlebell"]),
    ).toBe(false);
  });

  it("maps lat pulldown to machine not cable (HC-197)", () => {
    expect(expectedEquipmentFromName("Lat Pulldown")).toEqual(["machine"]);
    expect(expectedEquipmentFromName("Cable Lat Pulldown")).toEqual(["cable"]);
  });

  it("maps lying back extension to bodyweight, machine variant to machine", () => {
    expect(expectedEquipmentFromName("Lying Back Extension")).toEqual([
      "bodyweight",
    ]);
    expect(expectedEquipmentFromName("Back Extension Machine")).toEqual([
      "machine",
    ]);
  });

  it("maps jefferson curl variants and face pull bands/cable", () => {
    expect(
      expectedEquipmentForExercise({ name: "Jefferson Curl", notes: "" }),
    ).toEqual(["bench", "plyo_box"]);
    expect(
      expectedEquipmentForExercise({ name: "Weighted Jefferson Curl", notes: "" }),
    ).toEqual(["barbell", "bench", "dumbbell", "kettlebell", "plyo_box"]);
    expect(
      expectedEquipmentForExercise({ name: "Face Pull", notes: "" }),
    ).toEqual(["cable", "resistance_band"]);
  });
});
