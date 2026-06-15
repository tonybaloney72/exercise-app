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
          "CR-17",
          "HC-196",
          "HC-214",
          "HC-183",
          "CR-11",
          "CR-21",
          "HC-221",
          "CS-9",
          "HC-082",
          "CR-12",
          "CS-19",
          "CS-11",
          "CR-7",
        ],
        [
          "HC-184",
          "HC-270",
          "CF-5",
          "HC-219",
          "UP-8",
          "HC-125",
          "CF-14",
          "HC-130",
          "CL-5",
          "PC-30",
          "HC-272",
          "CF-2",
          "CL-11",
          "HC-136",
          "PC-35",
        ],
        [
          "HC-082",
          "HC-202",
          "CR-6",
          "CS-5",
          "PC-11",
          "LB-9",
          "CR-17",
          "CR-8",
          "CS-9",
          "PC-31",
          "LB-1",
          "CR-29",
          "CS-4",
          "CS-11",
          "PC-21",
        ],
        [
          "UPL-23",
          "UPL-21",
          "CF-9",
          "CR-21",
          "PC-30",
          "UPL-1",
          "CF-5",
          "HC-130",
          "CR-29",
          "UP-8",
          "UPL-19",
          "HC-201",
          "CR-28",
          "CR-22",
          "PC-11",
        ],
        [
          "HC-261",
          "PC-2",
          "LB-9",
          "HC-219",
          "CS-9",
          "HC-128",
          "PC-11",
          "CL-11",
          "CS-26",
          "CS-3",
          "HC-189",
          "PC-29",
          "HC-242",
          "CL-9",
          "HC-196",
        ],
        [
          "HC-184",
          "UPL-16",
          "HC-130",
          "HC-136",
          "UP-8",
          "UP-25",
          "UPL-24",
          "HC-201",
          "HC-219",
          "PC-13",
          "PC-38",
          "UPL-19",
          "CF-8",
          "CL-1",
          "PC-1",
        ],
        [
          "HC-128",
          "PC-13",
          "HC-082",
          "CR-17",
          "HC-006",
          "HC-242",
          "PC-11",
          "CR-8",
          "CS-28",
          "HC-221",
          "HC-261",
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
    ).toMatchInlineSnapshot(`"d:|fv:|e:bodyweight|pm:preset|cbs:manual|ppl:ppl-2026-05-v4:balanced:pplSched:0:active_recovery,1:push,2:pull,3:legs,4:push,5:pull,6:legs|tp:balanced|2,2,2,2,2|wbp:off|rd:standard|wrd:default|wc:default|exp:core:intermediate,cardio:intermediate,lower:intermediate,upper_push:intermediate,upper_pull:intermediate|su:|sd:"`);
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
