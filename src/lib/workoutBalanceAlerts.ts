import type { DayPlan, ExerciseCategory } from "@/types";

export type BalanceAlert = {
  id: string;
  severity: "warning" | "info";
  message: string;
};

const PUSH: ExerciseCategory[] = ["UP"];
const PULL: ExerciseCategory[] = ["UPL"];
const CORE: ExerciseCategory[] = ["CF", "CL", "CR", "CS"];
const LOWER: ExerciseCategory[] = ["LB"];
const CONDITIONING: ExerciseCategory[] = ["PC"];

function countCategories(plan: DayPlan): Map<ExerciseCategory, number> {
  const counts = new Map<ExerciseCategory, number>();
  for (const round of plan.rounds) {
    for (const ex of round.exercises) {
      counts.set(ex.category, (counts.get(ex.category) ?? 0) + 1);
    }
  }
  return counts;
}

function sumCategories(
  counts: Map<ExerciseCategory, number>,
  cats: ExerciseCategory[],
): number {
  return cats.reduce((n, c) => n + (counts.get(c) ?? 0), 0);
}

/** Heuristic balance hints for a single day's prescribed workout. */
export function analyzeDayPlanBalance(plan: DayPlan): BalanceAlert[] {
  const counts = countCategories(plan);
  const totalSlots = [...counts.values()].reduce((a, b) => a + b, 0);
  if (totalSlots === 0) return [];

  const push = sumCategories(counts, PUSH);
  const pull = sumCategories(counts, PULL);
  const core = sumCategories(counts, CORE);
  const lower = sumCategories(counts, LOWER);
  const pc = sumCategories(counts, CONDITIONING);

  const alerts: BalanceAlert[] = [];

  if (push >= 4 && pull === 0) {
    alerts.push({
      id: "push-no-pull",
      severity: "warning",
      message: `${push} push exercises and no pull - consider adding upper pull (UPL).`,
    });
  } else if (pull >= 4 && push === 0) {
    alerts.push({
      id: "pull-no-push",
      severity: "warning",
      message: `${pull} pull exercises and no push - consider adding upper push (UP).`,
    });
  } else if (push >= 3 && pull === 0) {
    alerts.push({
      id: "push-light-pull",
      severity: "info",
      message: "Heavy on push; no pull exercises in this workout.",
    });
  } else if (pull >= 3 && push === 0) {
    alerts.push({
      id: "pull-light-push",
      severity: "info",
      message: "Heavy on pull; no push exercises in this workout.",
    });
  }

  if (core >= 5 && push + pull + lower <= 1) {
    alerts.push({
      id: "core-heavy",
      severity: "info",
      message:
        "Mostly core work - check that upper/lower strength is covered elsewhere this week.",
    });
  }

  if (lower === 0 && push + pull >= 4 && plan.hasJog === false) {
    alerts.push({
      id: "no-lower",
      severity: "info",
      message:
        "No lower-body (LB) exercises - fine for an upper day if legs are trained on other days.",
    });
  }

  if (pc >= 4 && push + pull + lower <= 2) {
    alerts.push({
      id: "conditioning-heavy",
      severity: "info",
      message: "High conditioning volume relative to strength slots.",
    });
  }

  return alerts;
}
