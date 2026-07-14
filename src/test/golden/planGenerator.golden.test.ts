import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import {
  computePrefsFingerprint,
  materializeTrainingWeek,
} from "@/lib/planGenerator";
import { weekExerciseIdsByDay } from "@/test/weekTestUtils";
import {
  GOLDEN_EMPTY_PREFS,
  GOLDEN_EQUIPMENT,
  GOLDEN_VARIETY_SEED,
  materializeGoldenBalancedWeek,
} from "./fixtures";

/**
 * Behavior contract: same generator inputs + variety seed → same week exercise layout.
 * Update snapshots deliberately when the exercise catalog or generator rules change.
 */
describe("planGenerator golden contract", () => {
  it("locks balanced standard week exercise ids for the golden variety seed", () => {
    const ids = weekExerciseIdsByDay(materializeGoldenBalancedWeek());
    expect(ids).toMatchInlineSnapshot(`
      [
        [
          "HC-242",
          "LB-3",
          "HC-023",
          "HC-196",
          "HC-214",
          "HC-127",
          "CR-18",
          "CR-21",
          "HC-221",
          "HC-011",
          "LB-11",
          "CR-12",
          "CS-19",
          "CS-15",
          "HC-026",
        ],
        [
          "HC-184",
          "HC-270",
          "CF-5",
          "HC-219",
          "UP-8",
          "HC-010",
          "HC-031",
          "HC-035",
          "HC-032",
          "PC-66",
          "HC-272",
          "CF-2",
          "CL-14",
          "HC-136",
          "PC-42",
        ],
        [
          "HC-082",
          "SW-64",
          "CR-6",
          "CS-5",
          "PC-11",
          "LB-10",
          "CR-17",
          "CR-8",
          "CS-9",
          "PC-42",
          "LB-1",
          "HC-026",
          "CS-8",
          "CS-13",
          "PC-21",
        ],
        [
          "SW-63",
          "UPL-7",
          "HC-031",
          "CR-21",
          "PC-30",
          "UPL-9",
          "CF-5",
          "HC-130",
          "CR-29",
          "UP-8",
          "HC-028",
          "HC-201",
          "CR-28",
          "CR-22",
          "PC-19",
        ],
        [
          "LB-10",
          "PC-8",
          "LB-9",
          "HC-219",
          "CS-9",
          "HC-127",
          "PC-11",
          "CL-13",
          "CS-26",
          "CS-8",
          "HC-189",
          "PC-29",
          "HC-018",
          "CL-9",
          "CS-15",
        ],
        [
          "HC-057",
          "HC-051",
          "HC-130",
          "HC-136",
          "PC-9",
          "UP-25",
          "HC-052",
          "HC-201",
          "HC-219",
          "PC-18",
          "PC-38",
          "HC-240",
          "HC-031",
          "CL-1",
          "PC-63",
        ],
        [
          "HC-128",
          "PC-13",
          "HC-127",
          "CR-18",
          "SW-57",
          "LB-10",
          "PC-63",
          "HC-050",
          "CS-29",
          "HC-287",
          "HC-036",
          "UP-8",
          "HC-189",
          "CR-29",
          "CS-26",
        ],
      ]
    `);
  });

  it("is deterministic for repeated materialization with the same seed", () => {
    const a = materializeGoldenBalancedWeek();
    const b = materializeGoldenBalancedWeek();
    expect(weekExerciseIdsByDay(a)).toEqual(weekExerciseIdsByDay(b));
  });

  it("locks prefs fingerprint for default balanced standard inputs", () => {
    expect(
      computePrefsFingerprint(GOLDEN_EMPTY_PREFS, GOLDEN_EQUIPMENT),
    ).toMatchInlineSnapshot(`"d:|fv:|e:bench,bodyweight,plyo_box,pull_up_bar,resistance_band,sturdy_chair|pm:preset|cbs:manual|ppl:ppl-2026-05-v4:balanced:pplSched:0:active_recovery,1:push,2:pull,3:legs,4:push,5:pull,6:legs|tp:balanced|2,2,2,2,2|wbp:off|rd:standard|wrd:default|wc:default|exp:core:intermediate,cardio:intermediate,lower:intermediate,upper_push:intermediate,upper_pull:intermediate|st:w4|c5"`);
  });

  it("compact density reduces Monday slot count vs standard for the same seed", () => {
    const catalog = buildCatalogWeek();
    const standard = materializeTrainingWeek(
      catalog,
      GOLDEN_EMPTY_PREFS,
      GOLDEN_EQUIPMENT,
      "balanced",
      "standard",
      undefined,
      GOLDEN_VARIETY_SEED,
    );
    const compact = materializeTrainingWeek(
      catalog,
      GOLDEN_EMPTY_PREFS,
      GOLDEN_EQUIPMENT,
      "balanced",
      "compact",
      undefined,
      GOLDEN_VARIETY_SEED,
    );
    const mondaySlots = (week: ReturnType<typeof materializeGoldenBalancedWeek>) =>
      week[1]!.rounds.reduce((n, round) => n + round.exercises.length, 0);
    expect(mondaySlots(compact)).toBeLessThan(mondaySlots(standard));
    expect({ standard: mondaySlots(standard), compact: mondaySlots(compact) }).toMatchInlineSnapshot(`
      {
        "compact": 9,
        "standard": 15,
      }
    `);
  });
});
