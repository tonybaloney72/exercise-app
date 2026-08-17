import type { ExerciseEquipment } from "@/types";

export const BASIC_EXERCISE_EQUIPMENT: ExerciseEquipment[] = [
  "bodyweight",
  "rings",
  "resistance_band",
  "dumbbell",
  "kettlebell",
  "barbell",
  "cable",
  "medicine_ball",
  "bench",
  "plyo_box",
  "sturdy_chair",
  "stability_ball",
  "pull_up_bar",
  "bicycle",
  "indoor_bike",
  "treadmill",
  "elliptical",
  "rowing_machine",
  "stair_climber",
];

export const STRENGTH_MACHINE_GROUPS: {
  title: string;
  items: ExerciseEquipment[];
}[] = [
  {
    title: "Lower body",
    items: [
      "leg_press",
      "hack_squat",
      "pendulum_squat",
      "leg_extension",
      "leg_curl",
      "hip_abductor",
      "hip_adductor",
      "hip_flexor",
      "hip_thrust_machine",
      "glute_kickback",
    ],
  },
  {
    title: "Upper body",
    items: [
      "chest_press",
      "pec_deck",
      "lat_pulldown",
      "lat_pullover",
      "seated_row",
      "t_bar_row",
      "shoulder_press",
      "lateral_raise_machine",
      "reverse_fly_machine",
      "preacher_curl",
      "triceps_extension",
      "triceps_press",
    ],
  },
  {
    title: "Core & posterior",
    items: ["ab_crunch", "rotary_torso", "back_extension", "reverse_hyper"],
  },
  {
    title: "Other",
    items: ["smith_machine", "tibialis"],
  },
];

export const STRENGTH_MACHINE_EQUIPMENT: ExerciseEquipment[] =
  STRENGTH_MACHINE_GROUPS.flatMap((group) => group.items);

const STRENGTH_MACHINE_SET = new Set<ExerciseEquipment>(
  STRENGTH_MACHINE_EQUIPMENT,
);

export const ALL_EXERCISE_EQUIPMENT: ExerciseEquipment[] = [
  ...BASIC_EXERCISE_EQUIPMENT,
  ...STRENGTH_MACHINE_EQUIPMENT,
];

const ALL_EXERCISE_EQUIPMENT_SET = new Set<string>(ALL_EXERCISE_EQUIPMENT);

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  bodyweight: "Bodyweight",
  rings: "Rings",
  resistance_band: "Resistance bands",
  dumbbell: "Dumbbells",
  kettlebell: "Kettlebell",
  barbell: "Barbell",
  cable: "Cables",
  medicine_ball: "Medicine ball",
  bench: "Bench",
  plyo_box: "Plyo box",
  sturdy_chair: "Sturdy chair",
  stability_ball: "Stability ball / Bosu",
  pull_up_bar: "Pull-up bar",
  bicycle: "Bicycle",
  indoor_bike: "Indoor / stationary bike",
  treadmill: "Treadmill",
  elliptical: "Elliptical",
  rowing_machine: "Rowing machine",
  stair_climber: "Stairs / stepper",
  leg_press: "Leg press",
  hack_squat: "Hack squat",
  pendulum_squat: "Pendulum squat",
  leg_extension: "Leg extension",
  leg_curl: "Leg curl",
  hip_abductor: "Abductor",
  hip_adductor: "Adductor",
  hip_flexor: "Hip flexor machine",
  hip_thrust_machine: "Hip thrust machine",
  glute_kickback: "Glute kickback machine",
  chest_press: "Chest press",
  pec_deck: "Chest fly / pec deck",
  lat_pulldown: "Lat pulldown",
  lat_pullover: "Lat pullover machine",
  seated_row: "Seated row machine",
  t_bar_row: "T-bar row",
  shoulder_press: "Shoulder press machine",
  lateral_raise_machine: "Lateral raise machine",
  reverse_fly_machine: "Reverse fly machine",
  preacher_curl: "Preacher curl machine",
  triceps_extension: "Triceps extension machine",
  triceps_press: "Triceps press machine",
  ab_crunch: "Ab crunch machine",
  rotary_torso: "Oblique twist machine",
  back_extension: "Back extension / roman chair",
  reverse_hyper: "Reverse hyper",
  smith_machine: "Smith machine",
  tibialis: "Tibialis machine",
};

/** Default until the user completes equipment onboarding or changes Settings. */
export const DEFAULT_AVAILABLE_EQUIPMENT: ExerciseEquipment[] = ["bodyweight"];

const SURFACE_EQUIPMENT = new Set<ExerciseEquipment>([
  "bench",
  "plyo_box",
  "sturdy_chair",
  "stability_ball",
]);

const HANG_EQUIPMENT = new Set<ExerciseEquipment>(["pull_up_bar", "rings"]);

/**
 * Equipment roles for matching. Within a role, any listed option is enough;
 * across roles that appear on an exercise, the user must satisfy every role
 * (e.g. dumbbell + bench requires both a load implement and a bench/surface).
 */
const EQUIPMENT_ROLE: Record<ExerciseEquipment, "load" | "surface" | "hang"> =
  Object.fromEntries(
    ALL_EXERCISE_EQUIPMENT.map((eq) => {
      if (SURFACE_EQUIPMENT.has(eq)) return [eq, "surface"];
      if (HANG_EQUIPMENT.has(eq)) return [eq, "hang"];
      return [eq, "load"];
    }),
  ) as Record<ExerciseEquipment, "load" | "surface" | "hang">;

const LEGACY_EQUIPMENT_ALIASES: Record<string, ExerciseEquipment[]> = {
  outdoor_bicycle: ["bicycle"],
  /** Catch-all "Machines" checkbox → every specific strength machine. */
  machine: [...STRENGTH_MACHINE_EQUIPMENT],
};

/**
 * The old settings checkbox stored one `plyo_box` value for bench, box, and chair.
 * Expand on load so existing users keep the same exercise availability.
 */
function expandLegacyPlyoBoxSelection(
  equipment: Set<ExerciseEquipment>,
): void {
  if (equipment.has("plyo_box")) {
    equipment.add("bench");
    equipment.add("sturdy_chair");
  }
}

export function allStrengthMachinesSelected(
  selected: readonly string[],
): boolean {
  const set = new Set(selected);
  return STRENGTH_MACHINE_EQUIPMENT.every((eq) => set.has(eq));
}

export function someStrengthMachineSelected(
  selected: readonly string[],
): boolean {
  return selected.some((eq) => STRENGTH_MACHINE_SET.has(eq as ExerciseEquipment));
}

export function setTypicalGymMachines(
  selected: ExerciseEquipment[],
  enabled: boolean,
): ExerciseEquipment[] {
  const withoutMachines = selected.filter(
    (eq) => !STRENGTH_MACHINE_SET.has(eq),
  );
  if (!enabled) {
    return withoutMachines.length > 0
      ? withoutMachines
      : [...DEFAULT_AVAILABLE_EQUIPMENT];
  }
  return [...withoutMachines, ...STRENGTH_MACHINE_EQUIPMENT];
}

export function migrateAvailableEquipment(
  raw: readonly string[] | undefined,
): ExerciseEquipment[] {
  if (!raw?.length) return [...DEFAULT_AVAILABLE_EQUIPMENT];

  const out = new Set<ExerciseEquipment>();
  for (const item of raw) {
    const legacy = LEGACY_EQUIPMENT_ALIASES[item];
    if (legacy) {
      for (const eq of legacy) out.add(eq);
      continue;
    }
    if (ALL_EXERCISE_EQUIPMENT_SET.has(item)) {
      out.add(item as ExerciseEquipment);
    }
  }
  expandLegacyPlyoBoxSelection(out);
  return [...out];
}

export function exerciseMatchesEquipment(
  exerciseEquipment: ExerciseEquipment[] | undefined,
  available: ExerciseEquipment[],
): boolean {
  if (!exerciseEquipment || exerciseEquipment.length === 0) return true;

  const byRole: Record<"load" | "surface" | "hang", ExerciseEquipment[]> = {
    load: [],
    surface: [],
    hang: [],
  };
  for (const eq of exerciseEquipment) {
    const role = EQUIPMENT_ROLE[eq];
    if (!role) return false;
    byRole[role].push(eq);
  }

  const availableSet = new Set(available);
  for (const role of ["load", "surface", "hang"] as const) {
    const needed = byRole[role];
    if (needed.length === 0) continue;
    if (!needed.some((eq) => availableSet.has(eq))) return false;
  }
  return true;
}
