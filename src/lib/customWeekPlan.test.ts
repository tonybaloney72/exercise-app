import { describe, expect, it } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { mergeWeekScheduleIntoStoredWeek } from "@/lib/customWeekPlan";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { buildProgramProfileInputFromSettings } from "@/lib/programProfile";
import { DEFAULT_SETTINGS } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";

describe("custom week mode materialization", () => {
  it("leaves strength round slots empty", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      programMode: "custom" as const,
    };
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      {},
      settings.availableEquipment,
      settings.trainingPriorityPreset,
      settings.roundDensity,
      undefined,
      "seed",
      buildProgramProfileInputFromSettings(settings),
      settings,
    );
    const monday = week[1]!;
    expect(monday.rounds.length).toBeGreaterThan(0);
    expect(
      monday.rounds.every((round) => round.exercises.length === 0),
    ).toBe(true);
  });
});

describe("mergeWeekScheduleIntoStoredWeek", () => {
  it("updates schedule metadata but keeps user rounds", () => {
    const catalog = buildCatalogWeek();
    const stored: TrainingWeekDays = {
      1: {
        ...catalog[1]!,
        dayOfWeek: 1,
        theme: "User Monday",
        rounds: [
          {
            roundNumber: 1,
            exercises: [
              { exerciseId: "UP-1", category: "UP", targetReps: "10" },
            ],
          },
        ],
      },
    };
    const shells: TrainingWeekDays = {
      1: {
        ...catalog[1]!,
        dayOfWeek: 1,
        theme: "Catalog Monday",
        restDayMode: "workout",
        rounds: [{ roundNumber: 1, exercises: [] }],
      },
    };
    const merged = mergeWeekScheduleIntoStoredWeek(stored, shells);
    expect(merged[1]!.theme).toBe("Catalog Monday");
    expect(merged[1]!.rounds[0]!.exercises[0]!.exerciseId).toBe("UP-1");
  });
});
