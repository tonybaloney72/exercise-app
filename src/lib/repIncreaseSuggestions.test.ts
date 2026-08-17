import { describe, expect, it } from "vitest";
import { exerciseMap } from "@/core/catalog";
import {
  buildLoadProgressionSuggestion,
  evaluateRepIncreaseSuggestions,
  REP_INCREASE_BUMP,
  REP_INCREASE_MARGIN,
} from "@/lib/repIncreaseSuggestions";
import type { ExerciseSettingsMap } from "@/lib/repos";
import type { WorkoutLog } from "@/types";

const JJ = "PC-1";
const DIPS = "UP-5";

function strengthLog(
  exerciseId: string,
  actualReps: number,
  targetPrescription: string,
): WorkoutLog["rounds"][number]["exercises"][number] {
  return {
    exerciseId,
    completed: true,
    skipped: false,
    actualReps,
    targetPrescription,
    loggingMode: "reps",
  };
}

function workoutOn(
  date: string,
  id: string,
  exercises: WorkoutLog["rounds"][number]["exercises"],
): WorkoutLog {
  return {
    id,
    date,
    dayOfWeek: 1,
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [{ roundNumber: 1, exercises }],
    notes: "",
    endTime: `${date}T12:00:00.000Z`,
  };
}

function jjHistory(dates: string[], reps: number, target = "50"): WorkoutLog[] {
  return dates.map((date, i) =>
    workoutOn(date, `w-jj-${i}`, [strengthLog(JJ, reps, target)]),
  );
}

describe("evaluateRepIncreaseSuggestions", () => {
  it("returns empty when disabled", () => {
    const today = "2026-07-02";
    const completed = workoutOn(today, "w-today", [
      strengthLog(JJ, 52, "50"),
    ]);
    const history = jjHistory(
      ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", today],
      52,
    );

    expect(
      evaluateRepIncreaseSuggestions({
        history,
        completedWorkout: completed,
        todayKey: today,
        exerciseSettings: {},
        enabled: false,
      }),
    ).toEqual([]);
  });

  it("suggests daily exercise after 4 of last 6 qualifying sessions", () => {
    const today = "2026-07-02";
    const dates = [
      "2026-06-27",
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      today,
    ];
    const history = jjHistory(dates, 52);
    const completed = history[history.length - 1]!;

    const suggestions = evaluateRepIncreaseSuggestions({
      history,
      completedWorkout: completed,
      todayKey: today,
      exerciseSettings: {
        [JJ]: { defaultSetMode: "reps", defaultTargetReps: 50 },
      },
      enabled: true,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.exerciseId).toBe(JJ);
    expect(suggestions[0]?.currentTarget).toBe(50);
    expect(suggestions[0]?.suggestedTarget).toBe(50 + REP_INCREASE_BUMP);
    expect(suggestions[0]?.reason).toContain(String(REP_INCREASE_MARGIN));
  });

  it("does not suggest when margin is not met today", () => {
    const today = "2026-07-02";
    const dates = [
      "2026-06-27",
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      today,
    ];
    const history = [
      ...jjHistory(dates.slice(0, -1), 52),
      workoutOn(today, "w-today", [strengthLog(JJ, 51, "50")]),
    ];
    const completed = history[history.length - 1]!;

    expect(
      evaluateRepIncreaseSuggestions({
        history,
        completedWorkout: completed,
        todayKey: today,
        exerciseSettings: {
          [JJ]: { defaultSetMode: "reps", defaultTargetReps: 50 },
        },
        enabled: true,
      }),
    ).toEqual([]);
  });

  it("suggests lower-frequency exercise after 2 consecutive qualifying sessions", () => {
    const today = "2026-07-14";
    const mon = "2026-07-01";
    const thu = "2026-07-14";
    const history = [
      workoutOn(mon, "w-mon", [strengthLog(DIPS, 12, "10")]),
      workoutOn(thu, "w-thu", [strengthLog(DIPS, 13, "10")]),
    ];
    const completed = history[1]!;

    const suggestions = evaluateRepIncreaseSuggestions({
      history,
      completedWorkout: completed,
      todayKey: today,
      exerciseSettings: {
        [DIPS]: { defaultSetMode: "reps", defaultTargetReps: 10 },
      },
      enabled: true,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.exerciseId).toBe(DIPS);
    expect(suggestions[0]?.reason).toContain("2 sessions in a row");
  });

  it("does not treat beating a stale catalog prescription as beating the library default", () => {
    const today = "2026-07-14";
    const mon = "2026-07-01";
    const history = [
      workoutOn(mon, "w-mon", [strengthLog(DIPS, 10, "8")]),
      workoutOn(today, "w-thu", [strengthLog(DIPS, 10, "8")]),
    ];
    const completed = history[1]!;

    expect(
      evaluateRepIncreaseSuggestions({
        history,
        completedWorkout: completed,
        todayKey: today,
        exerciseSettings: {
          [DIPS]: { defaultSetMode: "reps", defaultTargetReps: 10 },
        },
        enabled: true,
      }),
    ).toEqual([]);
  });

  it("still suggests when actual reps beat the library default by the margin", () => {
    const today = "2026-07-14";
    const mon = "2026-07-01";
    const history = [
      workoutOn(mon, "w-mon", [strengthLog(DIPS, 12, "8")]),
      workoutOn(today, "w-thu", [strengthLog(DIPS, 12, "8")]),
    ];
    const completed = history[1]!;

    const suggestions = evaluateRepIncreaseSuggestions({
      history,
      completedWorkout: completed,
      todayKey: today,
      exerciseSettings: {
        [DIPS]: { defaultSetMode: "reps", defaultTargetReps: 10 },
      },
      enabled: true,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.currentTarget).toBe(10);
    expect(suggestions[0]?.suggestedTarget).toBe(10 + REP_INCREASE_BUMP);
  });

  it("attributes swapped exercises to the substitute id", () => {
    const today = "2026-07-02";
    const substitute = "UP-1";
    const dates = [
      "2026-06-27",
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      today,
    ];
    const history = dates.map((date, i) =>
      workoutOn(date, `w-${i}`, [
        {
          exerciseId: DIPS,
          swappedWith: substitute,
          completed: true,
          skipped: false,
          actualReps: 15,
          targetPrescription: "12",
          loggingMode: "reps" as const,
        },
      ]),
    );
    const completed = history[history.length - 1]!;

    const suggestions = evaluateRepIncreaseSuggestions({
      history,
      completedWorkout: completed,
      todayKey: today,
      exerciseSettings: {
        [substitute]: { defaultSetMode: "reps", defaultTargetReps: 12 },
      },
      enabled: true,
    });

    expect(suggestions.map((s) => s.exerciseId)).toEqual([substitute]);
    expect(exerciseMap[substitute]?.name).toBeTruthy();
  });

  it("respects ignored and snoozed exercises", () => {
    const today = "2026-07-02";
    const dates = [
      "2026-06-27",
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      today,
    ];
    const history = jjHistory(dates, 52);
    const completed = history[history.length - 1]!;
    const base = {
      history,
      completedWorkout: completed,
      todayKey: today,
      enabled: true,
    } satisfies Partial<Parameters<typeof evaluateRepIncreaseSuggestions>[0]>;

    expect(
      evaluateRepIncreaseSuggestions({
        ...base,
        exerciseSettings: {
          [JJ]: {
            defaultSetMode: "reps",
            defaultTargetReps: 50,
            repSuggestionIgnored: true,
          },
        },
      }),
    ).toEqual([]);

    expect(
      evaluateRepIncreaseSuggestions({
        ...base,
        exerciseSettings: {
          [JJ]: {
            defaultSetMode: "reps",
            defaultTargetReps: 50,
            repSuggestionSnoozedUntil: "2026-07-15",
          },
        },
      }),
    ).toEqual([]);
  });

  it("suggests a load jump when at rep ceiling with heavier inventory", () => {
    const curlId = "HC-148"; // Dumbbell Hammer Curl
    const today = "2026-07-02";
    const dates = ["2026-06-25", today];
    const history = dates.map((date, i) =>
      workoutOn(date, `w-curl-${i}`, [
        {
          exerciseId: curlId,
          completed: true,
          skipped: false,
          actualReps: 14,
          weightLb: 5,
          targetPrescription: "12",
          loggingMode: "reps",
        },
      ]),
    );
    const completed = history[history.length - 1]!;

    const suggestions = evaluateRepIncreaseSuggestions({
      history,
      completedWorkout: completed,
      todayKey: today,
      exerciseSettings: {
        [curlId]: {
          defaultSetMode: "reps",
          defaultTargetReps: 12,
          defaultWeightLb: 5,
        },
      },
      weightInventory: {
        dumbbell: [{ weightLb: 5 }, { weightLb: 10 }, { weightLb: 15 }],
      },
      enabled: true,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      exerciseId: curlId,
      mode: "load",
      currentTarget: 12,
      suggestedTarget: 8,
      currentWeightLb: 5,
      suggestedWeightLb: 10,
    });
  });

  it("buildLoadProgressionSuggestion returns null when below ceiling or no next weight", () => {
    const curlId = "HC-148";
    const meta = exerciseMap[curlId];
    expect(
      buildLoadProgressionSuggestion({
        exerciseId: curlId,
        meta,
        stored: { defaultSetMode: "reps", defaultTargetReps: 10, defaultWeightLb: 5 },
        finalLog: {
          exerciseId: curlId,
          completed: true,
          skipped: false,
          weightLb: 5,
        },
        current: { mode: "reps", target: 10 },
        weightInventory: { dumbbell: [{ weightLb: 5 }, { weightLb: 10 }] },
        reason: "t",
      }),
    ).toBeNull();

    expect(
      buildLoadProgressionSuggestion({
        exerciseId: curlId,
        meta,
        stored: { defaultSetMode: "reps", defaultTargetReps: 12, defaultWeightLb: 50 },
        finalLog: {
          exerciseId: curlId,
          completed: true,
          skipped: false,
          weightLb: 50,
        },
        current: { mode: "reps", target: 12 },
        weightInventory: { dumbbell: [{ weightLb: 50 }] },
        reason: "t",
      }),
    ).toBeNull();
  });
});
