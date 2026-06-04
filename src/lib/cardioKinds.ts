import type { CardioActivityKind } from "@/types";

export const CARDIO_ACTIVITY_ORDER: CardioActivityKind[] = [
  "jog",
  "walk",
  "cycle",
  "hike",
  "swim",
];

export const CARDIO_KIND_TO_EXERCISE_ID: Record<CardioActivityKind, string> = {
  jog: "END-JOG",
  walk: "END-WALK",
  cycle: "END-CYCLE",
  hike: "END-HIKE",
  swim: "END-SWIM",
};

export const CARDIO_ACTIVITY_LABELS: Record<CardioActivityKind, string> = {
  jog: "Jog",
  walk: "Walk",
  cycle: "Cycle",
  hike: "Hike",
  swim: "Swim",
};

export const CARDIO_ACTIVITY_EMOJI: Record<CardioActivityKind, string> = {
  jog: "🏃",
  walk: "🚶",
  cycle: "🚴",
  hike: "🥾",
  swim: "🏊",
};
