import { describe, expect, it } from "vitest";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioActivities";
import {
  buildCardioHealthChartSeries,
  buildCardioHealthTotals,
} from "@/utils/cardioHealthProgressStats";
import type { WorkoutLog } from "@/types";

describe("cardioHealthProgressStats", () => {
  const jogId = CARDIO_KIND_TO_EXERCISE_ID.jog;

  it("builds kcal/hr chart points from completed cardio sessions", () => {
    const history = [
      {
        id: "w1",
        date: "2026-05-18",
        cardioExercises: [
          {
            exerciseId: jogId,
            completed: true,
            skipped: false,
            stepCount: 4200,
            activeCaloriesKcal: 310,
            avgHeartRateBpm: 142,
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
    ];

    const series = buildCardioHealthChartSeries(history);
    expect(series).toHaveLength(1);
    expect(series[0]?.stepCount).toBeUndefined();
    expect(series[0]?.activeCaloriesKcal).toBe(310);
    expect(series[0]?.avgHeartRateBpm).toBe(142);
  });

  it("totals active kcal and heart-rate sessions only", () => {
    const history = [
      {
        id: "w1",
        date: "2026-05-18",
        cardioExercises: [
          {
            exerciseId: jogId,
            completed: true,
            skipped: false,
            stepCount: 4200,
            activeCaloriesKcal: 310,
          },
          {
            exerciseId: jogId,
            completed: true,
            skipped: false,
            activeCaloriesKcal: 120,
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
    ];

    const totals = buildCardioHealthTotals(history);
    expect(totals.totalActiveKcal).toBe(430);
    expect(totals.sessionsWithKcal).toBe(2);
    expect(totals.sessionsWithHeartRate).toBe(0);
  });

  it("ignores incomplete or skipped cardio rows", () => {
    const history = [
      {
        id: "w1",
        date: "2026-05-19",
        cardioExercises: [
          {
            exerciseId: jogId,
            completed: false,
            skipped: false,
            activeCaloriesKcal: 1000,
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
    ];

    expect(buildCardioHealthChartSeries(history)).toHaveLength(0);
    expect(buildCardioHealthTotals(history).totalActiveKcal).toBe(0);
  });
});
