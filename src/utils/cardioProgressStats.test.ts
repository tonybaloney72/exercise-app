import { describe, expect, it } from "vitest";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioActivities";
import {
  buildCardioChartSeries,
  buildCardioSessionRows,
  formatCardioHistoryDayLabel,
  formatCardioSessionQuickSummary,
  groupCardioSessionsByDay,
} from "@/utils/cardioProgressStats";
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
    expect(series[0]?.speedMph).toBe(6.2);
    expect(series[1]?.speedMph).toBe(6);
  });

  it("includes session step counts from Health Connect", () => {
    const walkId = CARDIO_KIND_TO_EXERCISE_ID.walk;
    const history = [
      {
        id: "w1",
        date: "2026-05-18",
        cardioExercises: [
          {
            exerciseId: walkId,
            completed: true,
            skipped: false,
            actualDuration: 1200,
            stepCount: 3100,
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
    ];

    const series = buildCardioChartSeries(history, walkId);
    expect(series).toHaveLength(1);
    expect(series[0]?.stepCount).toBe(3100);
    expect(series[0]?.activeCaloriesKcal).toBeUndefined();
  });
});

describe("buildCardioSessionRows", () => {
  it("groups sessions by day with quick summaries", () => {
    const walkId = CARDIO_KIND_TO_EXERCISE_ID.walk;
    const history = [
      {
        id: "w1",
        date: "2026-05-18",
        cardioExercises: [
          {
            exerciseId: walkId,
            completed: true,
            skipped: false,
            actualDistanceMi: 2.5,
            actualDuration: 2400,
            activeCaloriesKcal: 180,
            cardioInstanceId: "a",
          },
          {
            exerciseId: walkId,
            completed: true,
            skipped: false,
            actualDistanceMi: 1,
            actualDuration: 900,
            cardioInstanceId: "b",
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
      {
        id: "w2",
        date: "2026-05-17",
        cardioExercises: [
          {
            exerciseId: walkId,
            completed: true,
            skipped: false,
            actualDuration: 600,
          },
        ],
      } satisfies Partial<WorkoutLog> as WorkoutLog,
    ];

    const rows = buildCardioSessionRows(history, walkId);
    expect(rows).toHaveLength(3);

    const groups = groupCardioSessionsByDay(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.date).toBe("2026-05-18");
    expect(groups[0]?.sessions).toHaveLength(2);
    expect(groups[0]?.sessions[0]?.label).toBe("Walk (1)");
    expect(groups[0]?.sessions[1]?.label).toBe("Walk (2)");
    expect(formatCardioSessionQuickSummary(groups[0]!.sessions[0]!)).toBe(
      "2.5 mi · 40:00 · 180 kcal",
    );
    expect(groups[1]?.sessions[0]?.label).toBe("Walk");
  });

  it("labels today in local timezone", () => {
    const today = new Date(2026, 5, 18, 12, 0, 0);
    expect(formatCardioHistoryDayLabel("2026-06-18", today)).toBe("Today");
    expect(formatCardioHistoryDayLabel("2026-05-17", today)).toMatch(/May 17/);
  });
});
