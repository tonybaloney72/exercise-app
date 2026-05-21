import { describe, expect, it } from "vitest";
import {
  findStaleInProgressSessions,
  isStaleSessionDate,
  pauseStaleInProgressLogs,
} from "@/lib/workoutSessionStale";
import type { WorkoutLog } from "@/types";

function log(date: string, partial?: Partial<WorkoutLog>): WorkoutLog {
  return {
    id: date,
    date,
    dayOfWeek: 1,
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    startTime: `${date}T12:00:00.000Z`,
    ...partial,
  };
}

describe("workoutSessionStale", () => {
  const today = "2026-05-18";

  it("detects past session dates", () => {
    expect(isStaleSessionDate("2026-05-17", today)).toBe(true);
    expect(isStaleSessionDate(today, today)).toBe(false);
    expect(isStaleSessionDate("2026-05-19", today)).toBe(false);
  });

  it("finds stale in-progress sessions", () => {
    const stale = findStaleInProgressSessions(
      [
        log("2026-05-10", { paused: true }),
        log("2026-05-17"),
        log(today),
        log("2026-05-16", { endTime: "done" }),
      ],
      today,
    );
    expect(stale.map((w) => w.date)).toEqual(["2026-05-17", "2026-05-10"]);
  });

  it("pauseStaleInProgressLogs pauses only past non-paused rows", () => {
    const { history, changedIds } = pauseStaleInProgressLogs(
      [log("2026-05-17"), log("2026-05-10", { paused: true }), log(today)],
      today,
    );
    expect(changedIds).toEqual(["2026-05-17"]);
    expect(history.find((w) => w.date === "2026-05-17")?.paused).toBe(true);
    expect(history.find((w) => w.date === today)?.paused).toBeFalsy();
  });
});
