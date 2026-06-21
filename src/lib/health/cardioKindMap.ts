import type { WorkoutType } from "@capgo/capacitor-health";
import type { CardioActivityKind } from "@/types";

const CARDIO_TO_WORKOUT_TYPE: Partial<Record<CardioActivityKind, WorkoutType>> = {
  walk: "walking",
  jog: "running",
  hike: "hiking",
  cycle: "cycling",
  swim: "swimming",
  treadmill: "runningTreadmill",
  elliptical: "elliptical",
  indoor_bike: "bikingStationary",
  row: "rowing",
  stairs: "stairClimbing",
};

export function cardioKindToWorkoutType(
  kind: CardioActivityKind,
): WorkoutType | undefined {
  return CARDIO_TO_WORKOUT_TYPE[kind];
}
