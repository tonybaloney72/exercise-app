import { describe, expect, it } from "vitest";
import {
  ALL_EXERCISE_EQUIPMENT,
  BASIC_EXERCISE_EQUIPMENT,
  STRENGTH_MACHINE_EQUIPMENT,
  exerciseMatchesEquipment,
  migrateAvailableEquipment,
  setTypicalGymMachines,
} from "@/data/equipment";
import { exercises } from "@/core/catalog";

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

  it("does not treat a lat pulldown as covering a leg press", () => {
    expect(
      exerciseMatchesEquipment(["leg_press"], ["lat_pulldown"]),
    ).toBe(false);
    expect(
      exerciseMatchesEquipment(["leg_press"], ["leg_press"]),
    ).toBe(true);
    expect(
      exerciseMatchesEquipment(["lat_pulldown"], STRENGTH_MACHINE_EQUIPMENT),
    ).toBe(true);
  });
});

describe("migrateAvailableEquipment", () => {
  it("expands legacy catch-all machines to every specific machine", () => {
    const migrated = migrateAvailableEquipment(["bodyweight", "machine"]);
    expect(migrated).toEqual(
      expect.arrayContaining(["bodyweight", ...STRENGTH_MACHINE_EQUIPMENT]),
    );
    expect(migrated).not.toContain("machine");
  });

  it("toggles the typical gym preset without dropping other gear", () => {
    const withGym = setTypicalGymMachines(["bodyweight", "dumbbell"], true);
    expect(withGym).toEqual(
      expect.arrayContaining(["bodyweight", "dumbbell", "leg_press"]),
    );
    expect(setTypicalGymMachines(withGym, false)).toEqual([
      "bodyweight",
      "dumbbell",
    ]);
  });
});

describe("catalog equipment", () => {
  it("never uses the generic machine tag", () => {
    for (const ex of exercises) {
      expect(ex.equipment ?? [], ex.id).not.toContain("machine");
    }
  });

  it("lists basic gear separately from strength machines", () => {
    expect(ALL_EXERCISE_EQUIPMENT).toEqual([
      ...BASIC_EXERCISE_EQUIPMENT,
      ...STRENGTH_MACHINE_EQUIPMENT,
    ]);
    expect(ALL_EXERCISE_EQUIPMENT).not.toContain("machine");
  });
});
