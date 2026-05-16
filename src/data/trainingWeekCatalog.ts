/**
 * Author template week — **seed / reference only**.
 * Production reads go through `planResolver` (persisted or materialized week).
 */
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan } from "@/types";

export const TRAINING_WEEK_CATALOG: DayPlan[] = [
  // ── SUNDAY (0) — Active Recovery ──
  {
    dayOfWeek: 0,
    name: "Sunday",
    theme: "Active Recovery",
    hasJog: false,
    strengthFocus: [],
    coreGroups: ["CS"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "CS-5", targetReps: "12", category: "CS" },
          { exerciseId: "CS-3", targetReps: "8 each", category: "CS" },
          { exerciseId: "LB-1", targetReps: "10", category: "LB" },
          { exerciseId: "CS-4", targetReps: "20–30 sec", category: "CS" },
          { exerciseId: "LB-6", targetReps: "12", category: "LB" },
        ],
      },
    ],
  },

  // ── MONDAY (1) — Upper Push + Core Front + Core Lower Abs ──
  {
    dayOfWeek: 1,
    name: "Monday",
    theme: "Upper Push + Core Front + Core Lower Abs",
    hasJog: true,
    strengthFocus: ["UP"],
    coreGroups: ["CF", "CL"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "UP-1", targetReps: "10–13", category: "UP" },
          { exerciseId: "CP-1", targetReps: "20", category: "CP" },
          { exerciseId: "CF-1", targetReps: "12", category: "CF" },
          { exerciseId: "CF-2", targetReps: "10", category: "CF" },
          { exerciseId: "CL-1", targetReps: "12", category: "CL" },
        ],
      },
      {
        roundNumber: 2,
        exercises: [
          { exerciseId: "UP-2", targetReps: "8–10", category: "UP" },
          { exerciseId: "CP-2", targetReps: "20 each", category: "CP" },
          { exerciseId: "CF-3", targetReps: "12", category: "CF" },
          { exerciseId: "CF-5", targetReps: "15", category: "CF" },
          { exerciseId: "CL-2", targetReps: "10", category: "CL" },
        ],
      },
      {
        roundNumber: 3,
        exercises: [
          { exerciseId: "UP-3", targetReps: "8–10", category: "UP" },
          { exerciseId: "CP-1", targetReps: "20", category: "CP" },
          { exerciseId: "CF-4", targetReps: "10", category: "CF" },
          { exerciseId: "CF-6", targetReps: "12", category: "CF" },
          { exerciseId: "CL-3", targetReps: "12 each", category: "CL" },
        ],
      },
    ],
  },

  // ── TUESDAY (2) — Lower Body + Core Rotational + Core Stability ──
  {
    dayOfWeek: 2,
    name: "Tuesday",
    theme: "Lower Body + Core Rotational + Core Stability",
    hasJog: true,
    strengthFocus: ["LB"],
    coreGroups: ["CR", "CS"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "LB-1", targetReps: "15", category: "LB" },
          { exerciseId: "LB-2", targetReps: "10 each", category: "LB" },
          { exerciseId: "CR-1", targetReps: "12 each", category: "CR" },
          { exerciseId: "CR-4", targetReps: "15 each", category: "CR" },
          { exerciseId: "CS-3", targetReps: "10 each", category: "CS" },
        ],
      },
      {
        roundNumber: 2,
        exercises: [
          { exerciseId: "LB-7", targetReps: "12", category: "LB" },
          { exerciseId: "LB-6", targetReps: "15–20", category: "LB" },
          { exerciseId: "CR-2", targetReps: "12 each", category: "CR" },
          { exerciseId: "CR-6", targetReps: "20–30 sec each", category: "CR" },
          { exerciseId: "CS-4", targetReps: "30–45 sec", category: "CS" },
        ],
      },
      {
        roundNumber: 3,
        exercises: [
          { exerciseId: "LB-3", targetReps: "10 each", category: "LB" },
          { exerciseId: "LB-5", targetReps: "30–45 sec", category: "LB" },
          { exerciseId: "CR-5", targetReps: "12 each", category: "CR" },
          { exerciseId: "CR-3", targetReps: "12 each", category: "CR" },
          { exerciseId: "CS-5", targetReps: "15", category: "CS" },
        ],
      },
    ],
  },

  // ── WEDNESDAY (3) — Upper Pull + Core Front + Core Rotational ──
  {
    dayOfWeek: 3,
    name: "Wednesday",
    theme: "Upper Pull + Core Front + Core Rotational",
    hasJog: true,
    strengthFocus: ["UPL"],
    coreGroups: ["CF", "CR"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "UPL-1", targetReps: "8–12", category: "UPL" },
          { exerciseId: "UPL-3", targetReps: "12–15", category: "UPL" },
          { exerciseId: "CF-1", targetReps: "12", category: "CF" },
          { exerciseId: "CF-7", targetReps: "10", category: "CF" },
          { exerciseId: "CR-1", targetReps: "12 each", category: "CR" },
        ],
      },
      {
        roundNumber: 2,
        exercises: [
          { exerciseId: "UPL-2", targetReps: "12–15", category: "UPL" },
          { exerciseId: "UPL-4", targetReps: "12–15", category: "UPL" },
          { exerciseId: "CF-2", targetReps: "10", category: "CF" },
          { exerciseId: "CF-3", targetReps: "12", category: "CF" },
          { exerciseId: "CR-4", targetReps: "15 each", category: "CR" },
        ],
      },
      {
        roundNumber: 3,
        exercises: [
          { exerciseId: "UPL-6", targetReps: "10–12", category: "UPL" },
          { exerciseId: "UPL-5", targetReps: "12–15", category: "UPL" },
          { exerciseId: "CF-5", targetReps: "15", category: "CF" },
          { exerciseId: "CF-4", targetReps: "10", category: "CF" },
          { exerciseId: "CR-5", targetReps: "12 each", category: "CR" },
        ],
      },
    ],
  },

  // ── THURSDAY (4) — Lower Body + Cardio/Plyo + Core Lower Abs + Core Stability ──
  {
    dayOfWeek: 4,
    name: "Thursday",
    theme: "Lower Body + Cardio/Plyo + Core Lower Abs + Core Stability",
    hasJog: true,
    strengthFocus: ["LB", "CP"],
    coreGroups: ["CL", "CS"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "LB-1", targetReps: "15", category: "LB" },
          { exerciseId: "LB-8", targetReps: "10 each", category: "LB" },
          { exerciseId: "CP-5", targetReps: "20 each", category: "CP" },
          { exerciseId: "CL-4", targetReps: "10", category: "CL" },
          { exerciseId: "CS-1", targetReps: "10", category: "CS" },
        ],
      },
      {
        roundNumber: 2,
        exercises: [
          { exerciseId: "LB-3", targetReps: "10 each", category: "LB" },
          { exerciseId: "LB-6", targetReps: "15–20", category: "LB" },
          { exerciseId: "CP-3", targetReps: "20 each", category: "CP" },
          { exerciseId: "CL-5", targetReps: "12", category: "CL" },
          { exerciseId: "CS-2", targetReps: "10 each", category: "CS" },
        ],
      },
      {
        roundNumber: 3,
        exercises: [
          { exerciseId: "LB-7", targetReps: "12", category: "LB" },
          { exerciseId: "LB-2", targetReps: "10 each", category: "LB" },
          { exerciseId: "CP-4", targetReps: "5–8", category: "CP" },
          { exerciseId: "CL-6", targetReps: "12", category: "CL" },
          { exerciseId: "CS-4", targetReps: "30–45 sec", category: "CS" },
        ],
      },
    ],
  },

  // ── FRIDAY (5) — Upper Push + Upper Pull + Core Front + Core Lower Abs ──
  {
    dayOfWeek: 5,
    name: "Friday",
    theme: "Upper Push + Upper Pull + Core Front + Core Lower Abs",
    hasJog: true,
    strengthFocus: ["UP", "UPL"],
    coreGroups: ["CF", "CL"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "UP-1", targetReps: "10–13", category: "UP" },
          { exerciseId: "UPL-1", targetReps: "8–12", category: "UPL" },
          { exerciseId: "CP-7", targetReps: "15 each", category: "CP" },
          { exerciseId: "CF-6", targetReps: "12", category: "CF" },
          { exerciseId: "CL-1", targetReps: "12", category: "CL" },
        ],
      },
      {
        roundNumber: 2,
        exercises: [
          { exerciseId: "UP-5", targetReps: "8–12", category: "UP" },
          { exerciseId: "UPL-2", targetReps: "12–15", category: "UPL" },
          { exerciseId: "CP-1", targetReps: "20", category: "CP" },
          { exerciseId: "CF-3", targetReps: "12", category: "CF" },
          { exerciseId: "CL-3", targetReps: "12 each", category: "CL" },
        ],
      },
      {
        roundNumber: 3,
        exercises: [
          { exerciseId: "UP-4", targetReps: "10–12", category: "UP" },
          { exerciseId: "UPL-3", targetReps: "12–15", category: "UPL" },
          { exerciseId: "CP-2", targetReps: "20 each", category: "CP" },
          { exerciseId: "CF-7", targetReps: "10", category: "CF" },
          { exerciseId: "CL-2", targetReps: "10", category: "CL" },
        ],
      },
    ],
  },

  // ── SATURDAY (6) — Lower Body + Cardio/Plyo + Core Rotational + Core Stability ──
  {
    dayOfWeek: 6,
    name: "Saturday",
    theme: "Lower Body + Cardio/Plyo + Core Rotational + Core Stability",
    hasJog: true,
    strengthFocus: ["LB", "CP"],
    coreGroups: ["CR", "CS"],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          { exerciseId: "LB-1", targetReps: "15", category: "LB" },
          { exerciseId: "LB-2", targetReps: "10 each", category: "LB" },
          { exerciseId: "CP-6", targetReps: "8–10", category: "CP" },
          { exerciseId: "CR-1", targetReps: "12 each", category: "CR" },
          { exerciseId: "CS-3", targetReps: "10 each", category: "CS" },
        ],
      },
      {
        roundNumber: 2,
        exercises: [
          { exerciseId: "LB-4", targetReps: "8 each", category: "LB" },
          { exerciseId: "LB-6", targetReps: "15–20", category: "LB" },
          { exerciseId: "CP-5", targetReps: "20 each", category: "CP" },
          { exerciseId: "CR-4", targetReps: "15 each", category: "CR" },
          { exerciseId: "CS-5", targetReps: "15", category: "CS" },
        ],
      },
      {
        roundNumber: 3,
        exercises: [
          { exerciseId: "LB-5", targetReps: "30–45 sec", category: "LB" },
          { exerciseId: "LB-8", targetReps: "10 each", category: "LB" },
          { exerciseId: "CP-4", targetReps: "5–8", category: "CP" },
          { exerciseId: "CR-6", targetReps: "20–30 sec each", category: "CR" },
          { exerciseId: "CS-1", targetReps: "10", category: "CS" },
        ],
      },
    ],
  },
];

/** Seed template for one day (0 = Sunday). Not for production UI reads. */
export function getCatalogPlanForDay(dayOfWeek: number): DayPlan {
  const plan = TRAINING_WEEK_CATALOG.find((p) => p.dayOfWeek === dayOfWeek);
  if (!plan) {
    throw new Error(`No catalog plan for dayOfWeek ${dayOfWeek}`);
  }
  return plan;
}

/** Full Sun–Sat template week for generator seeding. */
export function buildCatalogWeek(): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    out[i] = getCatalogPlanForDay(i);
  }
  return out;
}
