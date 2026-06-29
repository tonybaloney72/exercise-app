import type { CardioActivityKind } from "@/types";

export const CARDIO_ACTIVITY_ORDER: CardioActivityKind[] = [
  "jog",
  "walk",
  "hike",
  "cycle",
  "treadmill",
  "elliptical",
  "indoor_bike",
  "row",
  "stairs",
  "swim",
];

export const CARDIO_KIND_TO_EXERCISE_ID: Record<CardioActivityKind, string> = {
  jog: "END-JOG",
  walk: "END-WALK",
  hike: "END-HIKE",
  cycle: "END-CYCLE",
  treadmill: "END-TREADMILL",
  elliptical: "END-ELLIPTICAL",
  indoor_bike: "END-INDOOR-BIKE",
  row: "END-ROW",
  stairs: "END-STAIR",
  swim: "END-SWIM",
};

export const CARDIO_ACTIVITY_LABELS: Record<CardioActivityKind, string> = {
  jog: "Jog",
  walk: "Walk",
  hike: "Hike",
  cycle: "Cycle",
  treadmill: "Treadmill",
  elliptical: "Elliptical",
  indoor_bike: "Indoor bike",
  row: "Rowing",
  stairs: "Stairs / stepper",
  swim: "Swim",
};

export const CARDIO_ACTIVITY_EMOJI: Record<CardioActivityKind, string> = {
  jog: "🏃",
  walk: "🚶",
  hike: "🥾",
  cycle: "🚴",
  treadmill: "🏃",
  elliptical: "🔄",
  indoor_bike: "🚴",
  row: "🚣",
  stairs: "🪜",
  swim: "🏊",
};

/** Outdoor activities use phone GPS during Start/End tracking; indoor machines do not. */
export const CARDIO_USES_GPS: Record<CardioActivityKind, boolean> = {
  jog: true,
  walk: true,
  hike: true,
  cycle: true,
  swim: false,
  treadmill: false,
  elliptical: false,
  indoor_bike: false,
  row: false,
  stairs: false,
};

export function cardioKindUsesGps(kind: CardioActivityKind): boolean {
  return CARDIO_USES_GPS[kind];
}

export function isCardioActivityKind(value: string): value is CardioActivityKind {
  return (CARDIO_ACTIVITY_ORDER as readonly string[]).includes(value);
}

export function cardioKindForExerciseId(
  exerciseId: string,
): CardioActivityKind | undefined {
  for (const kind of CARDIO_ACTIVITY_ORDER) {
    if (CARDIO_KIND_TO_EXERCISE_ID[kind] === exerciseId) return kind;
  }
  return undefined;
}
