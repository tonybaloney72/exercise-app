import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportedCardioSession } from "@/lib/health/cardioHealth";

const checkCardioHealthReadAccess = vi.fn();
const queryWorkoutsOverlappingWindow = vi.fn();
const mapWorkoutToImportedSession = vi.fn();
const fetchCardioHealthMetricsForWindow = vi.fn();

vi.mock("@/lib/health/cardioHealth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/health/cardioHealth")>();
  return {
    ...actual,
    checkCardioHealthReadAccess: (...args: unknown[]) =>
      checkCardioHealthReadAccess(...args),
    queryWorkoutsOverlappingWindow: (...args: unknown[]) =>
      queryWorkoutsOverlappingWindow(...args),
    mapWorkoutToImportedSession: (...args: unknown[]) =>
      mapWorkoutToImportedSession(...args),
    fetchCardioHealthMetricsForWindow: (...args: unknown[]) =>
      fetchCardioHealthMetricsForWindow(...args),
  };
});

vi.mock("@/lib/diagnostics/clientTrace", () => ({
  clientTrace: vi.fn(),
}));

import { resolveCardioQuickLog } from "@/lib/health/resolveCardioQuickLog";

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

describe("resolveCardioQuickLog", () => {
  const startDate = new Date(2026, 5, 18, 12, 0, 0);
  const endDate = new Date(2026, 5, 18, 12, 30, 0);

  beforeEach(() => {
    vi.clearAllMocks();
    checkCardioHealthReadAccess.mockResolvedValue(true);
    fetchCardioHealthMetricsForWindow.mockResolvedValue({});
  });

  it("returns timer_only when HC access is denied and no GPS", async () => {
    checkCardioHealthReadAccess.mockResolvedValue(false);

    const result = await resolveCardioQuickLog({
      kind: "jog",
      startDate,
      endDate,
    });

    expect(result.resolution).toBe("timer_only");
    expect(result.durationSeconds).toBe(30 * 60);
  });

  it("auto-picks a matching HC session", async () => {
    const imported = session({
      startDate,
      endDate,
      workoutType: "running",
      distanceMi: 3.2,
      sourceName: "Samsung Health",
    });
    queryWorkoutsOverlappingWindow.mockResolvedValue([{ id: "w1" }]);
    mapWorkoutToImportedSession.mockReturnValue(imported);
    fetchCardioHealthMetricsForWindow.mockResolvedValue({
      stepCount: 4000,
      activeCaloriesKcal: 280,
    });

    const result = await resolveCardioQuickLog({
      kind: "jog",
      startDate,
      endDate,
      gpsSnapshot: {
        distanceMi: 3.1,
        pointCount: 120,
        durationSeconds: 1800,
        startDate,
        endDate,
        points: [
          { lat: 40.0, lng: -105.0, timestamp: startDate.getTime() },
          { lat: 40.02, lng: -105.0, timestamp: endDate.getTime() },
        ],
      },
    });

    expect(result.resolution).toBe("health_connect_session");
    expect(result.distanceMi).toBe(3.1);
    expect(result.gpsTrack).toHaveLength(2);
    expect(result.health?.stepCount).toBe(4000);
    expect(result.health?.source).toBe("gps");
  });

  it("prefers ME GPS over HC sample distance", async () => {
    queryWorkoutsOverlappingWindow.mockResolvedValue([]);
    fetchCardioHealthMetricsForWindow.mockResolvedValue({
      distanceMi: 0.66,
      stepCount: 1384,
    });

    const result = await resolveCardioQuickLog({
      kind: "walk",
      startDate,
      endDate,
      gpsSnapshot: {
        distanceMi: 0.71,
        pointCount: 80,
        durationSeconds: 1800,
        startDate,
        endDate,
        points: [
          { lat: 40.0, lng: -105.0, timestamp: startDate.getTime() },
          { lat: 40.01, lng: -105.0, timestamp: endDate.getTime() },
        ],
      },
    });

    expect(result.resolution).toBe("health_connect_samples");
    expect(result.distanceMi).toBe(0.71);
    expect(result.health?.source).toBe("gps");
  });

  it("returns ambiguous sessions when ranking is inconclusive", async () => {
    const s1 = session({
      startDate,
      endDate,
      workoutType: "other",
      distanceMi: 2,
    });
    const s2 = session({
      startDate,
      endDate,
      workoutType: "other",
      distanceMi: 2.1,
    });
    queryWorkoutsOverlappingWindow.mockResolvedValue([{}, {}]);
    mapWorkoutToImportedSession
      .mockReturnValueOnce(s1)
      .mockReturnValueOnce(s2);

    const result = await resolveCardioQuickLog({
      kind: "jog",
      startDate,
      endDate,
    });

    expect(result.resolution).toBe("timer_only");
    expect(result.ambiguousSessions?.length).toBeGreaterThan(0);
  });

  it("falls back to samples when no sessions match", async () => {
    queryWorkoutsOverlappingWindow.mockResolvedValue([]);
    fetchCardioHealthMetricsForWindow.mockResolvedValue({
      distanceMi: 1.5,
      stepCount: 2200,
      activeCaloriesKcal: 150,
    });

    const result = await resolveCardioQuickLog({
      kind: "walk",
      startDate,
      endDate,
    });

    expect(result.resolution).toBe("health_connect_samples");
    expect(result.distanceMi).toBe(1.5);
  });

  it("preferSamples skips session matching", async () => {
    const imported = session({
      startDate,
      endDate,
      workoutType: "running",
      distanceMi: 3,
    });
    queryWorkoutsOverlappingWindow.mockResolvedValue([{}]);
    mapWorkoutToImportedSession.mockReturnValue(imported);
    fetchCardioHealthMetricsForWindow.mockResolvedValue({
      distanceMi: 1.1,
      stepCount: 1000,
    });

    const result = await resolveCardioQuickLog({
      kind: "jog",
      startDate,
      endDate,
      preferSamples: true,
    });

    expect(result.resolution).toBe("health_connect_samples");
    expect(result.distanceMi).toBe(1.1);
    expect(queryWorkoutsOverlappingWindow).not.toHaveBeenCalled();
  });
});
