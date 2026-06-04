import { ROUND_DENSITY_TARGETS, type RoundDensityOption } from "@/lib/programProfile";
import type { RoundDensity } from "@/types";

/** Working rounds 1–3: same count as global round-density targets (3 / 5 / 7). */
export function pplWorkingExerciseCount(density: RoundDensity): number {
  return ROUND_DENSITY_TARGETS[density];
}

/** Leg day round 4 — dense core circuits (e.g. 15 moves in ~13 min). */
export const PPL_CORE_BLOCK_COUNT: Record<RoundDensity, number> = {
  compact: 5,
  standard: 10,
  full: 15,
};

/** Active recovery strength round. */
export const PPL_RECOVERY_COUNT: Record<RoundDensity, number> = {
  compact: 3,
  standard: 5,
  full: 7,
};

/** Leg day: round index (1-based) for the core block. */
export const PPL_LEG_CORE_ROUND = 4;

/** Settings copy when program mode is 6-day P/P/L. */
export const PPL_ROUND_DENSITY_OPTIONS: RoundDensityOption[] = [
  {
    value: "compact",
    label: "Compact",
    description:
      "3 exercises × 3 working rounds. Leg core block: 5 moves. Shorter sessions.",
  },
  {
    value: "standard",
    label: "Standard",
    description:
      "5 exercises × 3 working rounds. Leg core block: 10 moves. Default.",
  },
  {
    value: "full",
    label: "Full",
    description:
      "7 exercises × 3 working rounds. Leg core block: 15 moves. Longer sessions.",
  },
];

const PPL_PRESET_DESCRIPTION =
  "Sun–Sat push / pull / legs split: rounds 1–3 repeat the same strength exercises (like 3 sets). Push and pull days add cardio in the Cardio & endurance section (time and distance). Leg days finish with one core block. Turn weekdays to active recovery, stretches only, or full rest below for a lighter week (e.g. 3-day P/P/L).";
