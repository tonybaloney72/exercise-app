import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import type { DayPlan, StretchEntry } from "@/types";

/**
 * Legacy full-body defaults (reference / fallback). Prefer {@link resolveStretchesForDay}
 * for day-specific warm-up and cool-down from `DayPlan` focus metadata.
 */

export const DEFAULT_WARM_UP: StretchEntry[] = [
  { exerciseId: "SW-1", targetReps: "10 each direction" },   // Arm Circles
  { exerciseId: "SW-2", targetReps: "10 each direction" },   // Shoulder Rolls
  { exerciseId: "SW-3", targetReps: "10 each side" },        // Cross-Body Arm Swings
  { exerciseId: "SW-7", targetReps: "10" },                  // Cat-Cow
  { exerciseId: "SW-5", targetReps: "10 each side" },        // Torso Twists
  { exerciseId: "SW-14", targetReps: "10 each direction" },  // Hip Circles
  { exerciseId: "SW-12", targetReps: "10 each leg" },        // Leg Swings (Front-Back)
  { exerciseId: "SW-11", targetReps: "8 each leg" },         // Walking Lunges
  { exerciseId: "SW-15", targetReps: "10" },                 // Glute Bridges
  { exerciseId: "SW-16", targetReps: "5 each side" },        // World's Greatest Stretch
];

export const DEFAULT_COOL_DOWN: StretchEntry[] = [
  { exerciseId: "SC-2", targetReps: "30 sec" },              // Child's Pose
  { exerciseId: "SC-1", targetReps: "20–30 sec" },           // Cobra Stretch
  { exerciseId: "SC-3", targetReps: "20 sec each side" },    // Seated Spinal Twist
  { exerciseId: "SC-5", targetReps: "20–30 sec" },           // Chest Doorway Stretch
  { exerciseId: "SC-6", targetReps: "20 sec each arm" },     // Overhead Triceps Stretch
  { exerciseId: "SC-7", targetReps: "20 sec each arm" },     // Cross-Body Shoulder Stretch
  { exerciseId: "SC-9", targetReps: "20–30 sec each leg" },  // Standing Quad Stretch
  { exerciseId: "SC-10", targetReps: "20–30 sec each leg" }, // Standing Hamstring Stretch
  { exerciseId: "SC-12", targetReps: "20–30 sec each leg" }, // Standing Calf Stretch
  { exerciseId: "SC-14", targetReps: "20–30 sec" },          // Standing Forward Fold
];

/** Balanced template week Monday — used when no `DayPlan` is available. */
const FALLBACK_PLAN_FOR_STRETCHES: DayPlan = {
  dayOfWeek: 1,
  name: "Monday",
  theme: "Upper Push + Core",
  hasJog: true,
  strengthFocus: ["UP"],
  coreGroups: ["CF", "CL"],
  rounds: [{ roundNumber: 1, exercises: [] }],
};

export function defaultStretchesForUnknownDay(): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  return resolveStretchesForDay(FALLBACK_PLAN_FOR_STRETCHES);
}

export { resolveStretchesForDay } from "@/lib/dayStretchPlan";
