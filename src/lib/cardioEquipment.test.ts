import { describe, expect, it } from "vitest";
import {
  migrateAvailableEquipment,
  ALL_EXERCISE_EQUIPMENT,
} from "@/data/equipment";
import {
  CARDIO_USES_GPS,
  cardioKindUsesGps,
  isCardioActivityKind,
} from "@/lib/cardioKinds";
import { cardioKindAllowed } from "@/lib/cardioActivities";

describe("equipment migration", () => {
  it("maps legacy outdoor_bicycle to bicycle", () => {
    expect(
      migrateAvailableEquipment(["bodyweight", "outdoor_bicycle" as never]),
    ).toEqual(["bodyweight", "bicycle"]);
  });

  it("expands legacy plyo_box to bench and sturdy chair", () => {
    expect(
      migrateAvailableEquipment(["bodyweight", "plyo_box"]),
    ).toEqual(expect.arrayContaining(["bodyweight", "plyo_box", "bench", "sturdy_chair"]));
  });

  it("drops unknown legacy equipment ids", () => {
    expect(
      migrateAvailableEquipment(["bodyweight", "foo" as never]),
    ).toEqual(["bodyweight"]);
  });
});

describe("cardio kinds", () => {
  it("recognizes new activity kinds", () => {
    expect(isCardioActivityKind("treadmill")).toBe(true);
    expect(isCardioActivityKind("indoor_bike")).toBe(true);
    expect(isCardioActivityKind("jogging")).toBe(false);
  });

  it("tags outdoor vs indoor GPS usage", () => {
    expect(cardioKindUsesGps("walk")).toBe(true);
    expect(cardioKindUsesGps("cycle")).toBe(true);
    expect(cardioKindUsesGps("treadmill")).toBe(false);
    expect(cardioKindUsesGps("indoor_bike")).toBe(false);
    expect(cardioKindUsesGps("swim")).toBe(false);
    expect(Object.keys(CARDIO_USES_GPS)).toHaveLength(10);
  });

  it("gates treadmill on treadmill equipment", () => {
    expect(cardioKindAllowed("treadmill", ["bodyweight"])).toBe(false);
    expect(cardioKindAllowed("treadmill", ["bodyweight", "treadmill"])).toBe(
      true,
    );
  });

  it("gates outdoor cycle on bicycle only", () => {
    expect(cardioKindAllowed("cycle", ["indoor_bike"])).toBe(false);
    expect(cardioKindAllowed("cycle", ["bicycle"])).toBe(true);
    expect(cardioKindAllowed("indoor_bike", ["indoor_bike"])).toBe(true);
  });

  it("lists all cardio equipment in settings catalog", () => {
    expect(ALL_EXERCISE_EQUIPMENT).toContain("bicycle");
    expect(ALL_EXERCISE_EQUIPMENT).toContain("indoor_bike");
    expect(ALL_EXERCISE_EQUIPMENT).not.toContain("outdoor_bicycle" as never);
  });
});
