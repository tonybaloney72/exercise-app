import type { TrainingWeekDays } from "@/lib/repos";

/** Flat exercise ids per calendar day (0 = Sunday) for stable assertions. */
export function weekExerciseIdsByDay(week: TrainingWeekDays): string[][] {
  return Array.from({ length: 7 }, (_, dayIndex) => {
    const plan = week[dayIndex];
    if (!plan) return [];
    return plan.rounds.flatMap((round) =>
      round.exercises.map((ex) => ex.exerciseId),
    );
  });
}
