import { describe, expect, it } from "vitest";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioActivities";
import type { ImportedCardioSession } from "@/lib/health/cardioHealth";
import {
  cardioDistanceAgreementScore,
  cardioSessionTypeMatchScore,
  pickBestCardioSession,
  rankCardioSessionsForImport,
  rankCardioSessionsForWindow,
  sessionOverlapFraction,
} from "@/lib/health/cardioSessionMatch";

function session(
  partial: Partial<ImportedCardioSession> & {
    startDate: Date;
    endDate: Date;
  },
): ImportedCardioSession {
  return {
    durationSeconds: Math.round(
      (partial.endDate.getTime() - partial.startDate.getTime()) / 1000,
    ),
    ...partial,
  };
}

describe("sessionOverlapFraction", () => {
  it("returns full overlap when session covers user window", () => {
    const userStart = Date.UTC(2026, 5, 18, 12, 0, 0);
    const userEnd = Date.UTC(2026, 5, 18, 12, 30, 0);
    const overlap = sessionOverlapFraction(
      userStart,
      userEnd,
      Date.UTC(2026, 5, 18, 11, 55, 0),
      Date.UTC(2026, 5, 18, 12, 35, 0),
    );
    expect(overlap).toBeCloseTo(1, 2);
  });
});

describe("cardioSessionTypeMatchScore", () => {
  it("prefers exact mapped types", () => {
    expect(cardioSessionTypeMatchScore("jog", "running")).toBe(1);
    expect(cardioSessionTypeMatchScore("walk", "walking")).toBe(1);
  });

  it("allows generic other sessions for cardio kinds", () => {
    expect(cardioSessionTypeMatchScore("jog", "other")).toBeGreaterThan(0.3);
  });

  it("rejects strength sessions", () => {
    expect(cardioSessionTypeMatchScore("jog", "strengthTraining")).toBe(0);
  });
});

describe("cardioDistanceAgreementScore", () => {
  it("scores close GPS and session distances highly", () => {
    expect(cardioDistanceAgreementScore(2, 2.1)).toBeGreaterThan(0.8);
  });
});

describe("rankCardioSessionsForWindow", () => {
  const userStart = new Date(2026, 5, 18, 12, 0, 0);
  const userEnd = new Date(2026, 5, 18, 12, 30, 0);

  it("ranks a matching run above a strength session", () => {
    const ranked = rankCardioSessionsForWindow({
      kind: "jog",
      userStartMs: userStart.getTime(),
      userEndMs: userEnd.getTime(),
      gpsDistanceMi: 2,
      sessions: [
        session({
          startDate: userStart,
          endDate: userEnd,
          workoutType: "strengthTraining",
          distanceMi: 0,
        }),
        session({
          startDate: userStart,
          endDate: userEnd,
          workoutType: "other",
          distanceMi: 2.1,
        }),
      ],
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.session.workoutType).toBe("other");
  });

  it("auto-picks a clear winner", () => {
    const ranked = rankCardioSessionsForWindow({
      kind: "jog",
      userStartMs: userStart.getTime(),
      userEndMs: userEnd.getTime(),
      gpsDistanceMi: 3.1,
      sessions: [
        session({
          startDate: userStart,
          endDate: userEnd,
          workoutType: "running",
          distanceMi: 3.1,
        }),
        session({
          startDate: userStart,
          endDate: userEnd,
          workoutType: "other",
          distanceMi: 0.2,
        }),
      ],
    });

    const pick = pickBestCardioSession(ranked);
    expect(pick?.session.workoutType).toBe("running");
  });
});

describe("rankCardioSessionsForImport", () => {
  it("lists matching sessions most recent first", () => {
    const older = session({
      startDate: new Date(2026, 5, 17, 8, 0, 0),
      endDate: new Date(2026, 5, 17, 8, 45, 0),
      workoutType: "walking",
      distanceMi: 2.5,
    });
    const newer = session({
      startDate: new Date(2026, 5, 18, 9, 0, 0),
      endDate: new Date(2026, 5, 18, 9, 30, 0),
      workoutType: "walking",
      distanceMi: 1.2,
    });

    const ranked = rankCardioSessionsForImport("walk", [older, newer]);

    expect(ranked.map((row) => row.session.startDate)).toEqual([
      newer.startDate,
      older.startDate,
    ]);
  });
});

describe("rankCardioSessionsForWindow jog id", () => {
  it("uses jog catalog id in tests", () => {
    expect(CARDIO_KIND_TO_EXERCISE_ID.jog).toBeTruthy();
  });
});
