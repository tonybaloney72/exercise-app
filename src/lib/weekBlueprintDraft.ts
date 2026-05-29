import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import { groupsForCatalogDay } from "@/lib/weeklyCategoryLayout";
import type {
  DayBlueprint,
  DayBlueprintKind,
  RoundBlueprint,
  RoundCloneMode,
  WeekBlueprint,
} from "@/lib/weekBlueprint";

export const DAY_BLUEPRINT_KIND_LABELS: Record<DayBlueprintKind, string> = {
  workout: "Workout",
  active_recovery: "Active recovery",
  stretches: "Stretches only",
  full_rest: "Full rest",
};

export const DEFAULT_WORKOUT_ROUND_COUNT = 3;
export const DEFAULT_ACTIVE_RECOVERY_ROUND_COUNT = 1;
export const MAX_BLUEPRINT_ROUNDS = 6;

function catalogGroupsForDay(dow: number) {
  return groupsForCatalogDay(getCatalogPlanForDay(dow));
}

function roundFromGroups(groups: import("@/lib/weeklyCategoryLayout").LayoutGroup[]): RoundBlueprint {
  return { groups: [...groups] };
}

function buildDefaultRounds(
  dayKind: "workout" | "active_recovery",
  dow: number,
  prevRounds: RoundBlueprint[],
): RoundBlueprint[] {
  const baseGroups =
    prevRounds[0]?.groups.length
      ? prevRounds[0].groups
      : catalogGroupsForDay(dow);

  if (dayKind === "active_recovery") {
    const first = prevRounds[0];
    return [
      first
        ? { ...first, cloneOfRoundIndex: undefined, cloneMode: undefined }
        : roundFromGroups(baseGroups),
    ];
  }

  const rounds: RoundBlueprint[] = [];
  for (let i = 0; i < DEFAULT_WORKOUT_ROUND_COUNT; i++) {
    const existing = prevRounds[i];
    rounds.push(
      existing
        ? { ...existing, cloneOfRoundIndex: undefined, cloneMode: undefined }
        : roundFromGroups(baseGroups),
    );
  }
  return rounds;
}

export function defaultDayBlueprint(dow: number): DayBlueprint {
  return {
    dayKind: "workout",
    rounds: buildDefaultRounds("workout", dow, []),
    cardio: [],
  };
}

export function setDayKindInBlueprint(
  blueprint: WeekBlueprint,
  dow: number,
  dayKind: DayBlueprintKind,
): WeekBlueprint {
  const prev = blueprint[dow] ?? defaultDayBlueprint(dow);
  if (dayKind === "full_rest" || dayKind === "stretches") {
    return {
      ...blueprint,
      [dow]: { dayKind, rounds: [], cardio: [] },
    };
  }

  const kindChanged = prev.dayKind !== dayKind;
  let rounds = prev.rounds;

  if (kindChanged || rounds.length === 0) {
    rounds = buildDefaultRounds(dayKind, dow, prev.rounds);
  } else {
    rounds = rounds.map((r) => ({
      ...r,
      cloneOfRoundIndex: undefined,
      cloneMode: undefined,
    }));
  }

  return {
    ...blueprint,
    [dow]: { dayKind, rounds, cardio: prev.cardio ?? [] },
  };
}

export function addRoundInBlueprint(
  blueprint: WeekBlueprint,
  dow: number,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  if (day.rounds.length >= MAX_BLUEPRINT_ROUNDS) return blueprint;

  const catalogGroups = catalogGroupsForDay(dow);
  const last = day.rounds[day.rounds.length - 1];
  const next: RoundBlueprint = last
    ? { groups: [...last.groups], exerciseCount: last.exerciseCount }
    : roundFromGroups(catalogGroups);

  return {
    ...blueprint,
    [dow]: { ...day, rounds: [...day.rounds, next] },
  };
}

export function removeRoundInBlueprint(
  blueprint: WeekBlueprint,
  dow: number,
  roundIndex: number,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  if (day.rounds.length <= 1) return blueprint;

  const rounds = day.rounds.filter((_, i) => i !== roundIndex);
  return { ...blueprint, [dow]: { ...day, rounds } };
}

export function setRoundCountInBlueprint(
  blueprint: WeekBlueprint,
  dow: number,
  count: number,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  const n = Math.max(1, Math.min(6, count));
  const catalogGroups = groupsForCatalogDay(getCatalogPlanForDay(dow));
  const rounds: RoundBlueprint[] = [];
  for (let i = 0; i < n; i++) {
    const existing = day.rounds[i];
    rounds.push(
      existing ?? {
        groups: day.rounds[day.rounds.length - 1]?.groups.length
          ? [...(day.rounds[day.rounds.length - 1]!.groups)]
          : [...catalogGroups],
      },
    );
  }
  return { ...blueprint, [dow]: { ...day, rounds } };
}

export function toggleGroupInRound(
  blueprint: WeekBlueprint,
  dow: number,
  roundIndex: number,
  group: import("@/lib/weeklyCategoryLayout").LayoutGroup,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  const rounds = day.rounds.map((r, i) => {
    if (i !== roundIndex) return r;
    const on = r.groups.includes(group);
    const groups = on
      ? r.groups.filter((g) => g !== group)
      : [...r.groups, group];
    return {
      ...r,
      groups,
      cloneOfRoundIndex: undefined,
      cloneMode: undefined,
    };
  });
  return { ...blueprint, [dow]: { ...day, rounds } };
}

export function setRoundExerciseCount(
  blueprint: WeekBlueprint,
  dow: number,
  roundIndex: number,
  exerciseCount: number | undefined,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  const rounds = day.rounds.map((r, i) =>
    i === roundIndex ? { ...r, exerciseCount } : r,
  );
  return { ...blueprint, [dow]: { ...day, rounds } };
}

export function applyRoundCloneFromPrior(
  blueprint: WeekBlueprint,
  dow: number,
  roundIndex: number,
  cloneMode: RoundCloneMode,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  const source = day.rounds[roundIndex - 1];
  if (!source || roundIndex <= 0) return blueprint;
  const rounds = day.rounds.map((r, i) =>
    i === roundIndex
      ? {
          groups: [...source.groups],
          exerciseCount: source.exerciseCount,
          cloneOfRoundIndex: roundIndex - 1,
          cloneMode,
        }
      : r,
  );
  return { ...blueprint, [dow]: { ...day, rounds } };
}

export function cloneRoundInBlueprint(
  blueprint: WeekBlueprint,
  dow: number,
  sourceIndex: number,
  cloneMode: RoundCloneMode,
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  const source = day.rounds[sourceIndex];
  if (!source) return blueprint;
  const next: RoundBlueprint = {
    groups: [...source.groups],
    exerciseCount: source.exerciseCount,
    cloneOfRoundIndex: sourceIndex,
    cloneMode,
  };
  return {
    ...blueprint,
    [dow]: { ...day, rounds: [...day.rounds, next] },
  };
}

export function setDayCardioInBlueprint(
  blueprint: WeekBlueprint,
  dow: number,
  cardio: import("@/types").CardioActivityKind[],
): WeekBlueprint {
  const day = blueprint[dow] ?? defaultDayBlueprint(dow);
  return { ...blueprint, [dow]: { ...day, cardio } };
}

export function describeDayBlueprint(day: DayBlueprint): string {
  if (day.dayKind === "full_rest") return "Full rest";
  if (day.dayKind === "stretches") return "Stretches only";

  const kind = DAY_BLUEPRINT_KIND_LABELS[day.dayKind];
  if (day.rounds.length === 0) return `${kind} · no rounds`;

  const roundParts = day.rounds.map((r, i) => {
    const groups =
      r.groups.length > 0
        ? r.groups
            .map((g) => g.replace("upper_", "").replace("core_", ""))
            .join("+")
        : "—";
    const clone =
      r.cloneOfRoundIndex != null && r.cloneMode
        ? r.cloneMode === "repeat"
          ? "↻"
          : "≈"
        : "";
    return `R${i + 1}:${groups}${clone}`;
  });

  const cardio =
    (day.cardio?.length ?? 0) > 0
      ? ` · C&E: ${day.cardio!.join(", ")}`
      : "";

  return `${kind} · ${roundParts.join(" · ")}${cardio}`;
}

/** Compact label for day strip navigation. */
export function shortDayBlueprintLabel(day: DayBlueprint): string {
  if (day.dayKind === "full_rest") return "Rest";
  if (day.dayKind === "stretches") return "Stretch";
  if (day.dayKind === "active_recovery") {
    return day.rounds.length > 1 ? `${day.rounds.length} rnd` : "AR";
  }
  return day.rounds.length ? `${day.rounds.length} rnd` : "Workout";
}
