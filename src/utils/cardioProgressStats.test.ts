import { describe, expect, it } from "vitest";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioActivities";
import { buildCardioChartSeries } from "@/utils/cardioProgressStats";
import type { WorkoutLog } from "@/types";

describe("buildCardioChartSeries", () => {
  it("includes every completed session on the same day", () => {
    const jogId = CARDIO_KIND_TO_EXERCISE_ID.jog;
    const history = [
      {
        id: "w1",
        date: "2026-05-18",
        cardioExercises: [
          {
            exerciseId: jogId,
            completed: true,
            skipped: false,
            actualDistanceMi: 3.1,
            actualDuration: 1800,
          },
          {
            exerciseId: jogId,
            completed: true,
            skipped: false,
            actualDistanceMi: 1.5,
            actualDuration: 900,
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
    ];

    const series = buildCardioChartSeries(history, jogId);
    expect(series).toHaveLength(2);
    expect(series[0]?.distanceMi).toBe(3.1);
    expect(series[1]?.distanceMi).toBe(1.5);
    expect(series[1]?.xLabel).toContain("#2");
    expect(series[1]?.sessionIndex).toBe(2);
  });
});
