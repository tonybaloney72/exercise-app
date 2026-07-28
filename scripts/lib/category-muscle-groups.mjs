/**
 * Default muscle tags per exercise category (union of primary + secondary).
 * Aligns with Hybrid Calisthenics vocabulary where possible.
 *
 * Upper push (UP): Chest, Front/Lateral Deltoids (press/raise), Triceps, Serratus.
 * Upper pull (UPL): Lats, Rhomboids, Rear Deltoids, Biceps/Brachialis, Traps, Forearms.
 * Do not stamp core onto UPL by default — use secondaryCategory when a hang/row is
 * intentionally core-biased (e.g. hanging oblique raise).
 * Shoulder split: Front/Lateral Deltoids → UP; Rear Deltoids → UPL. When a name is a
 * vertical pull (upright row, face pull), prefer UPL even if lateral delts are tagged.
 */

/** @type {Record<string, string[]>} */
const CATEGORY_MUSCLE_GROUPS = {
  CF: ["Abs", "Transverse Abdominis", "Hip Flexors"],
  CL: ["Hip Flexors", "Abs", "Obliques"],
  CR: ["Obliques", "Abs", "Transverse Abdominis"],
  CS: ["Spinal Erectors", "Transverse Abdominis", "Glutes", "Hamstrings"],
  UP: ["Chest", "Front Deltoids", "Triceps", "Serratus Anterior"],
  UPL: [
    "Lats",
    "Rhomboids",
    "Rear Deltoids",
    "Biceps",
    "Traps",
    "Forearms",
    "Brachialis",
  ],
  LB: [
    "Quadriceps",
    "Hamstrings",
    "Glutes",
    "Calves",
    "Abductors",
    "Adductors",
    "Hip Flexors",
  ],
  PC: ["Quadriceps", "Glutes", "Hamstrings", "Calves", "Abs"],
  SW: ["Mobility"],
  SC: ["Mobility"],
};

/** @type {Array<{ pattern: RegExp; muscles: string[]; unless?: RegExp }>} */
const NAME_MUSCLE_RULES = [
  {
    pattern: /\b(diamond push|close grip push|tricep push|bench dip)\b/i,
    muscles: ["Triceps"],
  },
  {
    pattern:
      /\b(bicep|biceps curl|hammer curl|preacher curl|concentration curl|chin-up|chin up|chinup)\b/i,
    muscles: ["Biceps"],
  },
  { pattern: /\bbrachialis\b/i, muscles: ["Brachialis", "Biceps"] },
  {
    pattern:
      /\b(tricep|skull crush|pushdown|kickback|triceps extension|overhead extension|dip)\b/i,
    muscles: ["Triceps"],
  },
  {
    pattern: /\b(forearm|wrist curl|reverse curl|farmer'?s walk)\b/i,
    muscles: ["Forearms"],
  },
  {
    pattern:
      /\b(pull-up|pullup|pull up|lat pulldown|inverted row|(?:^|\s)row\b|face pull)\b/i,
    muscles: ["Lats", "Rhomboids", "Biceps", "Rear Deltoids"],
  },
  {
    pattern:
      /\b(bench|push-up|pushup|push up|chest press|pec fly|fly\b|chest fly)\b/i,
    muscles: ["Chest", "Triceps"],
  },
  {
    pattern:
      /\b(overhead press|shoulder press|military press|arnold press|pike push)\b/i,
    muscles: ["Front Deltoids", "Triceps"],
  },
  {
    pattern: /\b(lateral raise|side raise|y raise)\b/i,
    muscles: ["Front Deltoids", "Lateral Deltoids"],
  },
  {
    pattern: /\b(reverse fly|rear delt|band pull-apart)\b/i,
    muscles: ["Rear Deltoids", "Rhomboids", "Traps"],
  },
  {
    pattern: /\b(squat|lunge|leg press|split squat|step-up|step up)\b/i,
    muscles: ["Quadriceps", "Glutes"],
  },
  {
    pattern:
      /\b(deadlift|rdl|romanian|good morning|hamstring curl|nordic curl|hyperextension)\b/i,
    muscles: ["Hamstrings", "Glutes", "Spinal Erectors"],
  },
  {
    pattern: /\b(calf raise|heel raise|tibialis)\b/i,
    muscles: ["Calves", "Tibialis"],
  },
  {
    pattern: /\b(hip thrust|glute bridge|kickback|fire hydrant|clamshell)\b/i,
    muscles: ["Glutes", "Hamstrings"],
  },
  {
    pattern:
      /\b(oblique|wood chop|twist|side bend|pallof|bicycle crunch|russian twist)\b/i,
    muscles: ["Obliques"],
  },
  {
    pattern:
      /\b(plank|hollow|dead bug|vacuum|leg raise|toes to bar|knee raise)\b/i,
    muscles: ["Abs", "Hip Flexors"],
  },
  {
    pattern: /\b(superman|back extension|reverse hyper|bird dog)\b/i,
    muscles: ["Spinal Erectors", "Glutes"],
  },
  {
    pattern: /\b(box jump|broad jump|jump squat|plyo)\b/i,
    muscles: ["Quadriceps", "Glutes", "Calves"],
  },
  {
    pattern: /\b(rotator cuff|external rotation|internal rotation)\b/i,
    muscles: ["Rotator Cuff", "Rear Deltoids"],
  },
  {
    pattern: /\b(pec deck|serratus|protraction|scapular push)\b/i,
    muscles: ["Serratus Anterior", "Chest"],
  },
];

/**
 * @param {string | null | undefined} primary
 * @param {string | null | undefined} secondary
 */
export function categoryMuscleGroups(primary, secondary) {
  const set = new Set(CATEGORY_MUSCLE_GROUPS[primary ?? ""] ?? []);
  if (secondary) {
    for (const m of CATEGORY_MUSCLE_GROUPS[secondary] ?? []) set.add(m);
  }
  return [...set];
}

/**
 * @param {string} name
 * @param {string | null | undefined} category
 */
function inferMusclesFromName(name, category) {
  const set = new Set();
  const normalized = name.toLowerCase();

  for (const rule of NAME_MUSCLE_RULES) {
    if (rule.unless?.test(normalized)) continue;
    if (rule.pattern.test(normalized)) {
      for (const m of rule.muscles) set.add(m);
    }
  }

  // HC uses Pectoralis Major; catalog uses Chest - keep both when chest work is implied.
  if (set.has("Chest") && category === "UP") {
    set.add("Pectoralis Major");
  }

  return [...set];
}

/**
 * @param {{
 *   name: string;
 *   category: string | null;
 *   secondaryCategory?: string | null;
 *   existingMuscleGroups?: string[] | null;
 *   source?: "catalog" | "hybrid";
 * }} exercise
 */
export function resolveMuscleGroups(exercise) {
  const { name, category, secondaryCategory, existingMuscleGroups, source } =
    exercise;
  const primary = category ?? "";
  const set = new Set();

  if (source === "hybrid") {
    for (const m of existingMuscleGroups ?? []) set.add(m);
    for (const m of categoryMuscleGroups(primary, null)) set.add(m);
    for (const m of inferMusclesFromName(name, primary)) set.add(m);
    if (secondaryCategory) {
      for (const m of categoryMuscleGroups(secondaryCategory, null)) set.add(m);
    }
  } else {
    for (const m of categoryMuscleGroups(primary, secondaryCategory ?? null)) {
      set.add(m);
    }
    for (const m of inferMusclesFromName(name, primary)) set.add(m);
  }

  if (primary === "SW" || primary === "SC") {
    return ["Mobility"];
  }

  return [...set].sort((a, b) => a.localeCompare(b));
}

export function muscleGroupsEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}
