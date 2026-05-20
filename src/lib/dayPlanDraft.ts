import type { DayPlan } from "@/types";

function normalizeForCompare(plan: DayPlan): string {
  const rounds = plan.rounds.map((r) => ({
    n: r.roundNumber,
    ex: r.exercises.map((e) => ({
      id: e.exerciseId,
      cat: e.category,
      reps: e.targetReps,
    })),
  }));
  const warmUp = (plan.warmUp ?? []).map((e) => ({
    id: e.exerciseId,
    reps: e.targetReps,
  }));
  const coolDown = (plan.coolDown ?? []).map((e) => ({
    id: e.exerciseId,
    reps: e.targetReps,
  }));
  const cardio = (plan.cardioActivities ?? []).map((a) => a.kind).sort().join(",");
  return JSON.stringify({
    rounds,
    warmUp,
    coolDown,
    cardio,
    restDayMode: plan.restDayMode,
  });
}

export function isDayPlanDraftDirty(initial: DayPlan, draft: DayPlan): boolean {
  return normalizeForCompare(initial) !== normalizeForCompare(draft);
}

export function countPlannedExercises(plan: DayPlan): number {
  return plan.rounds.reduce((sum, round) => sum + round.exercises.length, 0);
}
