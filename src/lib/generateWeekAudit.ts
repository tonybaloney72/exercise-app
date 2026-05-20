import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { exerciseMap } from "@/data/exercises";
import { resolveStretchesForWeekSequential } from "@/lib/dayStretchPlan";
import { isEnduranceBlockExerciseId } from "@/lib/enduranceBlockExercises";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import type { ExercisePreferenceMap, TrainingWeekDays } from "@/lib/repos";
import { scoresFromPreset } from "@/lib/trainingPriorities";
import type { DayPlan, RoundDensity, StretchEntry, TrainingPriorityPreset } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type WeekAuditOptions = {
  preset?: TrainingPriorityPreset;
  roundDensity?: RoundDensity;
  varietySeed?: string;
  weekRotationKey?: string;
  availableEquipment?: typeof DEFAULT_AVAILABLE_EQUIPMENT;
  prefs?: ExercisePreferenceMap;
};

export type DayAuditRow = {
  dayOfWeek: number;
  dayName: string;
  planName: string;
  cardioKinds: string[];
  roundExerciseIds: string[];
  roundExerciseNames: string[];
  enduranceInRounds: string[];
  warmUpIds: string[];
  warmUpNames: string[];
  coolDownIds: string[];
  coolDownNames: string[];
};

export type RepeatCount = {
  id: string;
  name: string;
  count: number;
  days: string[];
};

export type WeekAuditReport = {
  generatedAt: string;
  options: Required<
    Pick<WeekAuditOptions, "preset" | "roundDensity" | "varietySeed" | "weekRotationKey">
  >;
  days: DayAuditRow[];
  stretchRepeatsAcrossWeek: RepeatCount[];
  strengthRepeatsAcrossWeek: RepeatCount[];
  stretchRepeatsWithinDay: { dayName: string; repeats: RepeatCount[] }[];
  summary: {
    totalStretchSlots: number;
    uniqueStretchIds: number;
    totalStrengthSlots: number;
    uniqueStrengthIds: number;
    enduranceIdsInRounds: string[];
  };
};

function nameFor(id: string): string {
  return exerciseMap[id]?.name ?? id;
}

function countRepeats(
  entries: { dayName: string; id: string }[],
): RepeatCount[] {
  const byId = new Map<string, { count: number; days: Set<string> }>();
  for (const { dayName, id } of entries) {
    const row = byId.get(id) ?? { count: 0, days: new Set<string>() };
    row.count += 1;
    row.days.add(dayName);
    byId.set(id, row);
  }
  return [...byId.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([id, v]) => ({
      id,
      name: nameFor(id),
      count: v.count,
      days: [...v.days],
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function repeatsWithinDay(
  ids: string[],
  dayName: string,
): RepeatCount[] {
  const counts = new Map<string, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, count]) => ({
      id,
      name: nameFor(id),
      count,
      days: [dayName],
    }));
}

function auditDay(
  plan: DayPlan,
  stretches: { warmUp: StretchEntry[]; coolDown: StretchEntry[] },
): DayAuditRow {
  const dayName = DAY_NAMES[plan.dayOfWeek] ?? `Day ${plan.dayOfWeek}`;
  const roundExerciseIds = plan.rounds.flatMap((r) =>
    r.exercises.map((e) => e.exerciseId),
  );
  const { warmUp, coolDown } = stretches;
  const warmUpIds = warmUp.map((e) => e.exerciseId);
  const coolDownIds = coolDown.map((e) => e.exerciseId);

  return {
    dayOfWeek: plan.dayOfWeek,
    dayName,
    planName: plan.name,
    cardioKinds: (plan.cardioActivities ?? []).map((c) => c.kind),
    roundExerciseIds,
    roundExerciseNames: roundExerciseIds.map(nameFor),
    enduranceInRounds: roundExerciseIds.filter(isEnduranceBlockExerciseId),
    warmUpIds,
    warmUpNames: warmUpIds.map(nameFor),
    coolDownIds,
    coolDownNames: coolDownIds.map(nameFor),
  };
}

export function buildWeekAuditReport(options: WeekAuditOptions = {}): WeekAuditReport {
  const preset = options.preset ?? "balanced";
  const roundDensity = options.roundDensity ?? "standard";
  const varietySeed = options.varietySeed ?? "audit-week-1";
  const weekRotationKey = options.weekRotationKey ?? "2026-05-18";
  const availableEquipment = options.availableEquipment ?? [...DEFAULT_AVAILABLE_EQUIPMENT];
  const prefs = options.prefs ?? {};

  const catalogWeek = buildCatalogWeek();
  const week: TrainingWeekDays = materializeTrainingWeek(
    catalogWeek,
    prefs,
    availableEquipment,
    preset,
    roundDensity,
    undefined,
    varietySeed,
  );

  const stretchCtx = buildStretchResolveContextFromInputs({
    defaultWarmUp: [],
    defaultCoolDown: [],
    authMode: "authenticated",
    exercisePreferences: prefs,
    trainingPriorityPreset: preset,
    trainingPriorityScores: scoresFromPreset(preset),
    trainingPriorityCustomized: false,
    weekRotationKey,
  });

  const weekPlans = Array.from({ length: 7 }, (_, d) => week[d] ?? null);
  const stretchesByDay = resolveStretchesForWeekSequential(weekPlans, stretchCtx);

  const days: DayAuditRow[] = [];
  const stretchFlat: { dayName: string; id: string }[] = [];
  const strengthFlat: { dayName: string; id: string }[] = [];

  for (let d = 0; d < 7; d++) {
    const plan = week[d];
    const stretches = stretchesByDay[d];
    if (!plan || !stretches) continue;
    const row = auditDay(plan, stretches);
    days.push(row);
    for (const id of row.warmUpIds) {
      stretchFlat.push({ dayName: row.dayName, id });
    }
    for (const id of row.coolDownIds) {
      stretchFlat.push({ dayName: row.dayName, id });
    }
    for (const id of row.roundExerciseIds) {
      strengthFlat.push({ dayName: row.dayName, id });
    }
  }

  const stretchRepeatsWithinDay = days
    .map((day) => {
      const all = [...day.warmUpIds, ...day.coolDownIds];
      const repeats = repeatsWithinDay(all, day.dayName);
      return repeats.length > 0 ? { dayName: day.dayName, repeats } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const enduranceIdsInRounds = [
    ...new Set(days.flatMap((d) => d.enduranceInRounds)),
  ];

  const allStretchIds = days.flatMap((d) => [...d.warmUpIds, ...d.coolDownIds]);

  return {
    generatedAt: new Date().toISOString(),
    options: { preset, roundDensity, varietySeed, weekRotationKey },
    days,
    stretchRepeatsAcrossWeek: countRepeats(stretchFlat),
    strengthRepeatsAcrossWeek: countRepeats(strengthFlat),
    stretchRepeatsWithinDay,
    summary: {
      totalStretchSlots: allStretchIds.length,
      uniqueStretchIds: new Set(allStretchIds).size,
      totalStrengthSlots: strengthFlat.length,
      uniqueStrengthIds: new Set(strengthFlat.map((s) => s.id)).size,
      enduranceIdsInRounds,
    },
  };
}

export function formatWeekAuditReport(report: WeekAuditReport): string {
  return JSON.stringify(report, null, 2);
}
