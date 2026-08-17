/**
 * Infer expected equipment from exercise name for catalog audit / enrichment.
 * Avoid false positives (e.g. "Bicycle" crunch ≠ bicycle implement).
 */

/** Names that mean bicycle-crunch style core work, not a bike. */
export function isAbBicycleExerciseName(name) {
  const n = (name ?? "").trim();
  if (!/\bbicycle\b/i.test(n)) return false;
  if (/^bicycle$/i.test(n)) return true;
  if (/\bbicycle\s+crunch/i.test(n)) return true;
  if (/\bstraight\s+leg\s+bicycle\b/i.test(n)) return true;
  if (/\breverse\s+bicycle\b/i.test(n)) return true;
  if (/\bbicycle\s+(kick|twist|pulses?)\b/i.test(n)) return true;
  if (/\b(crunch|oblique|abs|core)\b.*\bbicycle\b/i.test(n)) return true;
  if (/\bbicycle\b.*\b(straight\s+leg|crunch|kick|twist|oblique)\b/i.test(n))
    return true;
  return false;
}

/** True when the name clearly refers to riding a bike (cardio implement). */
export function isCyclingEquipmentName(name) {
  const n = (name ?? "").trim();
  if (isAbBicycleExerciseName(n)) return false;
  if (
    /\b(stationary\s+bike|indoor\s+bike|indoor\s+cycle|road\s+bike|spin\s+bike|air\s+bike|assault\s+bike|bike\s+erg|erg\s+bike)\b/i.test(
      n,
    )
  ) {
    return true;
  }
  if (/\b(^bike$|^cycling$|^cycle$)\b/i.test(n)) return true;
  if (
    /\bbike\b/i.test(n) &&
    /\b(cardio|ride|indoor|stationary|spin)\b/i.test(n)
  ) {
    return true;
  }
  return false;
}

/** Well-known moves that imply implements even when the name omits them. */
function equipmentFromNamedMove(name) {
  const n = name ?? "";
  if (/\bturkish\s+(sit[- ]?up|get[- ]?up)\b/i.test(n)) {
    return ["dumbbell", "kettlebell"];
  }
  if (/\bgoblet\s+(squat|lunge|carry|deadlift|press)\b/i.test(n)) {
    return ["kettlebell"];
  }
  if (/\blandmine\b/i.test(n)) return ["barbell"];
  if (/\bsuitcase\s+(squat|deadlift|carry|lunge)\b/i.test(n)) {
    return ["dumbbell", "kettlebell"];
  }
  if (/\bweighted\s+(jefferson|zercher)\s+curl\b/i.test(n)) {
    return ["barbell", "dumbbell", "kettlebell", "bench", "plyo_box"];
  }
  if (/\b(jefferson|zercher)\s+curl\b/i.test(n)) {
    return ["bodyweight", "bench", "plyo_box"];
  }
  if (/\bface\s+pull\b/i.test(n)) return ["cable", "resistance_band"];
  if (/\b(jefferson|zercher)\s+squat\b/i.test(n)) return ["barbell"];
  if (
    /\b(roman\s+chair|45\s+degree|glute\s+ham|ghd)\b/i.test(n) &&
    !/\b(lying|floor|prone)\b/i.test(n)
  ) {
    return ["back_extension"];
  }
  return [];
}

/**
 * Map an exercise name to a specific strength-machine tag.
 * Keep in sync with STRENGTH_MACHINE_EQUIPMENT in src/data/equipment.ts.
 * @param {string} name
 * @returns {string | null}
 */
const MACHINE_NAME_RULES = [
  { re: /\bsmith(\s+machine)?\b/i, tag: "smith_machine" },
  { re: /\bpendulum\s+squat\b/i, tag: "pendulum_squat" },
  { re: /\bhack\s+squat\b/i, tag: "hack_squat" },
  { re: /\bleg\s+press\b/i, tag: "leg_press" },
  { re: /\bleg\s+extension\b/i, tag: "leg_extension" },
  {
    re: /\b(leg\s+curl|hamstring\s+curl)\b/i,
    unless: /\b(band|cable)\b/i,
    tag: "leg_curl",
  },
  {
    re: /\blat\s+pulldown\b/i,
    unless: /\b(band|cable)\b/i,
    tag: "lat_pulldown",
  },
  {
    re: /\blat\s+pullover\b/i,
    unless: /\b(band|cable|dumbbell)\b/i,
    tag: "lat_pullover",
  },
  {
    re: /\b(chest\s+fly|pec\s+deck|pec\s+fly)\b/i,
    unless: /\b(band|cable|dumbbell)\b/i,
    tag: "pec_deck",
  },
  {
    re: /\bchest\s+press\b/i,
    require: /\bmachine\b/i,
    tag: "chest_press",
  },
  {
    re: /\blateral\s+raise\b/i,
    require: /\bmachine\b/i,
    tag: "lateral_raise_machine",
  },
  {
    re: /\b(overhead\s+press|shoulder\s+press)\b/i,
    require: /\bmachine\b/i,
    tag: "shoulder_press",
  },
  {
    re: /\breverse\s+fly\b/i,
    require: /\bmachine\b/i,
    tag: "reverse_fly_machine",
  },
  { re: /\bmachine\s+row\b/i, tag: "seated_row" },
  { re: /\bt[-\s]?bar\s+row\b/i, tag: "t_bar_row" },
  {
    re: /\bpreacher\s+(curl|bench)\b/i,
    unless: /\bdumbbell\b/i,
    tag: "preacher_curl",
  },
  {
    re: /\btriceps?\s+extension\b/i,
    require: /\bmachine\b/i,
    tag: "triceps_extension",
  },
  {
    re: /\btriceps?\s+press\b/i,
    require: /\bmachine\b/i,
    tag: "triceps_press",
  },
  { re: /\bab\s+crunch\b/i, require: /\bmachine\b/i, tag: "ab_crunch" },
  { re: /\b(oblique\s+twist|rotary\s+torso)\b/i, tag: "rotary_torso" },
  { re: /\babductor\b/i, require: /\bmachine\b/i, tag: "hip_abductor" },
  { re: /\badductor\b/i, require: /\bmachine\b/i, tag: "hip_adductor" },
  { re: /\bhip\s+flexor\b/i, require: /\bmachine\b/i, tag: "hip_flexor" },
  {
    re: /\bhip\s+thrust\b/i,
    require: /\bmachine\b/i,
    tag: "hip_thrust_machine",
  },
  {
    re: /\bglute\s+kickback\b/i,
    require: /\bmachine\b/i,
    tag: "glute_kickback",
  },
  {
    re: /\breverse\s+hyper(extension)?\b/i,
    require: /\bmachine\b/i,
    tag: "reverse_hyper",
  },
  {
    re: /\b(45\s+degree\s+back\s+raise|roman\s+chair|thigh-block\s+back\s+extension|back\s+extension\s+machine)\b/i,
    tag: "back_extension",
  },
  { re: /\btibialis\b/i, require: /\bmachine\b/i, tag: "tibialis" },
];

function specificMachineFromName(name) {
  const n = name ?? "";
  for (const rule of MACHINE_NAME_RULES) {
    if (!rule.re.test(n)) continue;
    if (rule.require && !rule.require.test(n)) continue;
    if (rule.unless?.test(n)) continue;
    return rule.tag;
  }
  return null;
}

const STRENGTH_MACHINE_TAGS = new Set([
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
  "ab_crunch",
  "rotary_torso",
  "back_extension",
  "reverse_hyper",
  "smith_machine",
  "tibialis",
]);

export function isStrengthMachineTag(tag) {
  return STRENGTH_MACHINE_TAGS.has(tag);
}

const NOTE_EQUIPMENT_PATTERNS = [
  [/\bdumbbells?\b/i, "dumbbell"],
  [/\bkettlebells?\b/i, "kettlebell"],
  [/\bresistance\s+bands?\b/i, "resistance_band"],
  [/\b(?:^|\s)bands?\b/i, "resistance_band"],
  [/\bbarbells?\b/i, "barbell"],
  [/\bcables?\b/i, "cable"],
  [/\bmedicine\s+balls?\b/i, "medicine_ball"],
  [/\bmed\s+balls?\b/i, "medicine_ball"],
  [/\bplyo(?:metric)?\s+box\b/i, "plyo_box"],
  [/\bsturdy\s+chair\b/i, "sturdy_chair"],
  [/\b(?:flat\s+)?bench\b/i, "bench"],
  [/\bstability\s+balls?\b/i, "stability_ball"],
  [/\bswiss\s+balls?\b/i, "stability_ball"],
  [/\b(?:gymnastic\s+)?rings?\b/i, "rings"],
  [/\bpull[- ]?up\s+bars?\b/i, "pull_up_bar"],
  [/\broman\s+chair\b/i, "back_extension"],
  [/\breverse\s+hyper/i, "reverse_hyper"],
  [/\bpreacher\s+bench\b/i, "preacher_curl"],
  [/\bpreacher\s+curl\s+machine\b/i, "preacher_curl"],
  [/\bleg\s+press\b/i, "leg_press"],
];

function inferEquipmentFromNotes(notes) {
  if (!notes) return [];
  const found = new Set();
  for (const [re, tag] of NOTE_EQUIPMENT_PATTERNS) {
    if (re.test(notes)) {
      if (tag === "bench" && /\broman\s+chair\b/i.test(notes)) continue;
      found.add(tag);
    }
  }
  return [...found].sort();
}

function mergeExpectedEquipment(...lists) {
  const found = new Set();
  for (const list of lists) {
    for (const tag of list ?? []) found.add(tag);
  }
  if ([...found].some((t) => t !== "bodyweight")) found.delete("bodyweight");
  if (found.size === 0) found.add("bodyweight");
  return [...found].sort();
}

/**
 * Expected equipment for audit: name patterns, named moves, then notes.
 */
export function expectedEquipmentForExercise({ name, notes }) {
  return mergeExpectedEquipment(
    equipmentFromNamedMove(name),
    expectedEquipmentFromName(name),
    inferEquipmentFromNotes(notes),
  );
}

/**
 * Expected equipment tags from name only. Conservative: default bodyweight.
 */
export function expectedEquipmentFromName(name) {
  const n = name ?? "";

  if (/\bring\b/i.test(n)) return ["rings"];
  if (
    /\b(pull-?up|chin-?up|dead hang|inverted row|hanging|toes to bar|front lever)\b/i.test(
      n,
    )
  ) {
    return ["pull_up_bar"];
  }
  if (/\b(swiss ball|bosu)\b/i.test(n)) return ["stability_ball"];
  if (/\b(medicine ball|med ball)\b/i.test(n)) return ["medicine_ball"];
  if (/\b(plyo|box jump|step-?up)\b/i.test(n) && /\bbox\b/i.test(n)) {
    return ["plyo_box"];
  }
  if (/\bband\b/i.test(n)) return ["resistance_band"];
  if (/\b(dumbbell|db )\b/i.test(n)) return ["dumbbell"];
  if (/\bkettlebell|kb\b/i.test(n)) return ["kettlebell"];
  if (/\bbarbell\b/i.test(n)) return ["barbell"];
  if (/\bcable\s+lat\s+pulldown\b/i.test(n)) return ["cable"];
  if (/\blat pulldown\b/i.test(n)) return ["lat_pulldown"];
  if (/\b(tricep pushdown|face pull|straight-arm pulldown)\b/i.test(n)) {
    return ["cable"];
  }
  if (/\bcable\b/i.test(n)) return ["cable"];
  const machine = specificMachineFromName(n);
  if (machine) return [machine];
  if (isCyclingEquipmentName(n)) return ["bicycle"];

  return ["bodyweight"];
}

/** Implement tags that satisfy the same slot in plans (OR alternatives). */
const INTERCHANGEABLE_GROUPS = [
  new Set(["dumbbell", "kettlebell"]),
  new Set(["dumbbell", "kettlebell", "barbell"]),
];

function setsOverlapViaInterchangeable(aSet, eSet) {
  for (const group of INTERCHANGEABLE_GROUPS) {
    const aHit = [...aSet].some((t) => group.has(t));
    const eHit = [...eSet].some((t) => group.has(t));
    if (aHit && eHit) return true;
  }
  return false;
}

/**
 * True when catalog tags and heuristic disagree materially.
 * Equipment arrays are OR-style (user needs any one listed implement).
 *
 * Curated catalog wins over a name-only bodyweight default - avoids flagging
 * exercises you already fixed (Turkish sit-up + DB/KB, roman chair + machine, etc.).
 */
export function equipmentAuditMismatch(actual, expected) {
  const a = [...(actual ?? [])].sort();
  const e = [...(expected ?? [])].sort();
  if (a.length === 0 || e.length === 0) return false;

  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (same(a, e)) return false;

  const aSet = new Set(a);
  const eSet = new Set(e);
  for (const tag of eSet) {
    if (aSet.has(tag)) return false;
  }
  if (setsOverlapViaInterchangeable(aSet, eSet)) return false;

  const aOnlyBw = aSet.size === 1 && aSet.has("bodyweight");
  const eOnlyBw = eSet.size === 1 && eSet.has("bodyweight");
  const aHasImplement = [...aSet].some((t) => t !== "bodyweight");
  const eHasImplement = [...eSet].some((t) => t !== "bodyweight");

  if (eOnlyBw && aHasImplement) return false;
  if (aOnlyBw && eHasImplement) return true;
  if (aHasImplement && eHasImplement) return true;

  return false;
}
