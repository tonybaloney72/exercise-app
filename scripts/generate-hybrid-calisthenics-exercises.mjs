/**
 * Generates src/core/catalog/data/hybridCalisthenicsExercises.ts from Hybrid Calisthenics
 * exercise library pages (https://www.hybridcalisthenics.com/exercise-library).
 *
 * Run: node scripts/generate-hybrid-calisthenics-exercises.mjs
 * (also runs prune-consolidated-exercises.mjs to drop merged HC/SW rows)
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { eachQualifier, generateHcNote } from "./enrich-hc-notes.mjs";
import {
  expectedEquipmentFromName,
  isStrengthMachineTag,
} from "./lib/equipment-heuristic.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../src/core/catalog/data/hybridCalisthenicsExercises.ts");

/** @type {Record<string, import('../src/types/index.ts').ExerciseCategory>} */
const MUSCLE_TO_CATEGORY = {
  Triceps: "UP",
  Biceps: "UPL",
  Brachialis: "UPL",
  Forearms: "UPL",
  "Front Deltoids": "UP",
  "Lateral Deltoids": "UP",
  "Rear Deltoids": "UPL",
  "Pectoralis Major": "UP",
  "Serratus Anterior": "UP",
  Lats: "UPL",
  Traps: "UPL",
  Rhomboids: "UPL",
  "Rotator Cuff": "UPL",
  Abs: "CF",
  Obliques: "CR",
  "Spinal Erectors": "CS",
  "Transverse Abdominis": "CS",
  Glutes: "LB",
  Abductors: "LB",
  "Hip Flexors": "CL",
  Hamstrings: "LB",
  Quadriceps: "LB",
  Adductors: "LB",
  Calves: "LB",
  Tibialis: "LB",
};

/**
 * Vertical-pull patterns listed under Lateral Deltoids on HC pages still belong in UPL.
 * Shoulder rule: front/lateral raise & press → UP; rear delt / upright row / face pull → UPL.
 * @type {Record<string, import('../src/types/index.ts').ExerciseCategory>}
 */
const NAME_CATEGORY_OVERRIDES = {
  "Band Upright Row": "UPL",
  "Barbell Upright Row": "UPL",
  "Cable Upright Row": "UPL",
  "Dumbbell Upright Row (Standard)": "UPL",
  "Dumbbell Upright Row (Wide)": "UPL",
  "Dumbbell Upright Row (Bending)": "UPL",
};

/** @type {Record<string, string>} */
const SECTION_TO_EQUIPMENT = {
  Bodyweight: "bodyweight",
  "Resistance Bands": "resistance_band",
  Dumbbell: "dumbbell",
  Barbell: "barbell",
  Machine: "machine",
  Cable: "cable",
};

/**
 * muscle -> section -> exercise names (from HC pages, May 2025).
 */
const PAGES = {
  Triceps: {
    Bodyweight: [
      "Close Grip Pushup",
      "Dips",
      "Rings Overhead Triceps Extension",
    ],
    "Resistance Bands": [
      "Band Overhead Triceps Extension",
      "Band Triceps Pushdown",
      "Band-resisted Pushup",
    ],
    Dumbbell: [
      "Dumbbell Skull Crusher",
      "Dumbbell Overhead Triceps Extension",
      "Close Grip Dumbbell Bench Press",
      "Close Grip Dumbbell Floor Press",
    ],
    Barbell: [
      "Barbell Skull Crusher",
      "Barbell Overhead Triceps Extension",
      "Close Grip Bench Press",
    ],
    Machine: ["Triceps Press Machine", "Triceps Extension Machine"],
    Cable: ["Cable Triceps Pushdown", "Cross Cable Pushdown"],
  },
  Biceps: {
    Bodyweight: ["Ring Curl", "Pelican Curl", "Chin Up"],
    "Resistance Bands": ["Band Biceps Curl"],
    Dumbbell: [
      "Standing Dumbbell Curl",
      "Dumbbell Preacher Curl",
      "Dumbbell Spider Curl",
      "Incline Dumbbell Curl",
      "Dumbbell Drag Curl",
    ],
    Barbell: ["Barbell Curl", "Barbell Drag Curl"],
    Machine: ["Preacher Curl Machine"],
    Cable: ["Cable Curl", "Face away Cable Curl", "High Cable Curl"],
  },
  Brachialis: {
    Bodyweight: ["Pullup", "Row", "Reverse Ring Curl"],
    "Resistance Bands": ["Band Hammer Curl"],
    Dumbbell: ["Dumbbell Hammer Curl", "Dumbbell Reverse Curl", "Zottman Curl"],
    Barbell: ["Barbell Reverse Curl"],
    Machine: [],
    Cable: ["Cable Hammer Curl"],
  },
  Forearms: {
    Bodyweight: ["Dead hang", "Pullup", "Row"],
    "Resistance Bands": [
      "Band Wrist Flexion",
      "Band Wrist Extension",
      "Band Pronation",
      "Band Supination",
      "Band Reverse Curl",
    ],
    Dumbbell: [
      "Dumbbell Wrist Curl",
      "Dumbbell Reverse Wrist Curl",
      "Dumbbell Reverse Curl",
    ],
    Barbell: [
      "Barbell Wrist Curl",
      "Barbell Reverse Wrist Curl",
      "Barbell Reverse Curl",
    ],
    Machine: [],
    Cable: [
      "Cable Wrist Curl",
      "Cable Reverse Wrist Curl",
      "Cable Reverse Curl",
    ],
  },
  "Front Deltoids": {
    Bodyweight: ["Pike Pushup", "Pseudo Planche Pushup", "Handstand Pushup"],
    "Resistance Bands": ["Band Front Raise", "Band Overhead Press"],
    Dumbbell: ["Dumbbell Front Raise", "Dumbbell Overhead Press"],
    Barbell: ["Barbell Front Raise", "Barbell Overhead Press"],
    Machine: ["Machine Overhead Press"],
    Cable: ["Cable Front Raise", "Cable Overhead Press"],
  },
  "Lateral Deltoids": {
    Bodyweight: ["Pike Pushup", "Wall Lateral Raise", "Ring Y-Raise"],
    "Resistance Bands": [
      "Band Lateral Raise",
      "Band Overhead Press",
      "Band Upright Row",
    ],
    Dumbbell: [
      "Dumbbell Lateral Raise",
      "Egyptian Dumbbell Lateral Raise",
      "Side-Lying Dumbbell Lateral Raise",
      "Dumbbell Overhead Press",
      "Dumbbell Upright Row (Standard)",
      "Dumbbell Upright Row (Wide)",
      "Dumbbell Upright Row (Bending)",
      "Dumbbell Y-Raise",
    ],
    Barbell: ["Barbell Overhead Press", "Barbell Upright Row"],
    Machine: ["Machine Overhead Press", "Machine Lateral Raise"],
    Cable: ["Cable Lateral Raise", "Cable Upright Row", "Cable Y-Raise"],
  },
  "Rear Deltoids": {
    Bodyweight: ["Ring Reverse Fly", "Ring Row", "Ring Face Pull"],
    "Resistance Bands": ["Rear Delt Fly", "Band Row", "Face Pull"],
    Dumbbell: [
      "Dumbbell Reverse Fly",
      "Dumbbell Bent-Over Row",
      "Dumbbell Upright Row (Bending)",
    ],
    Barbell: ["Barbell Bent-Over Row"],
    Machine: ["Machine Reverse Fly", "Machine Row"],
    Cable: ["Rear Delt Fly", "Cable Row", "Face Pull"],
  },
  "Pectoralis Major": {
    Bodyweight: ["Pushup", "Decline Pushup", "Dip", "Commando Pullup"],
    "Resistance Bands": [
      "Band-resisted Pushup",
      "Band Chest Press",
      "Band Press-around",
    ],
    Dumbbell: [
      "Dumbbell Bench Press",
      "Dumbbell Incline Bench Press",
      "Dumbbell Bench Fly",
      "Dumbbell Floor Fly",
      "Dumbbell Floor Press",
      "Close Grip Dumbbell Floor Press",
      "Dumbbell Pullover",
    ],
    Barbell: ["Barbell Bench Press", "Barbell Incline Bench Press"],
    Machine: [
      "Machine Chest Fly",
      "Machine Chest Press",
      "Machine Incline Chest Press",
      "Machine Decline Chest Press",
    ],
    Cable: [
      "Cable Chest Fly",
      "Cable Chest Press",
      "Incline Cable Chest Press",
      "Decline Cable Chest Press",
      "Cable Press-around",
    ],
  },
  "Serratus Anterior": {
    Bodyweight: [
      "Plank To Dolphin Pose",
      "Serratus Pushup",
      "Wall-slide",
      "Ring Roll-out",
    ],
    "Resistance Bands": [
      "Band-resisted Reach",
      "Band-resisted Serratus Pushup",
    ],
    Dumbbell: [
      "Dumbbell Uppercut",
      "Dumbbell Full Rom Front Raise",
      "Dumbbell Overhead Press",
    ],
    Barbell: ["Barbell Overhead Press"],
    Machine: ["Machine Overhead Press"],
    Cable: ["Cable Reach", "Cable Full Rom Front Raise"],
  },
  Lats: {
    Bodyweight: ["Pullup", "Row", "Elbow Press", "Front Lever Raise"],
    "Resistance Bands": ["Band Row", "Band Lat Pulldown"],
    Dumbbell: ["Dumbbell Bent-Over Row"],
    Barbell: ["Barbell Bent-Over Row"],
    Machine: ["Lat Pulldown", "Machine Row", "Lat Pullover Machine"],
    Cable: ["Cable Lat Pulldown", "Cable Row", "Cable Lat Pushdown"],
  },
  Traps: {
    Bodyweight: [
      "Pullup",
      "Row",
      "Elbow Press",
      "Ring Reverse Fly",
      "Ring Y-raise",
      "Upside Down Shrug",
    ],
    "Resistance Bands": [
      "Band Row",
      "Band Shrug",
      "Band Reverse Fly",
      "Band Pull-apart",
    ],
    Dumbbell: [
      "Dumbbell Bent-Over Row",
      "Dumbbell Reverse Fly",
      "Dumbbell Y-raise",
      "Dumbbell Shrug",
    ],
    Barbell: ["Barbell Bent-Over Row", "Barbell Shrug"],
    Machine: [
      "T Bar Row",
      "Machine Reverse Fly",
      "Machine Row",
      "Lat Pulldown",
    ],
    Cable: ["Cable Row", "Cable Reverse Fly", "Cable Shrug"],
  },
  Rhomboids: {
    Bodyweight: ["Pullup", "Row", "Elbow Press", "Ring Reverse Fly"],
    "Resistance Bands": ["Band Row", "Band Reverse Fly", "Band Pull-apart"],
    Dumbbell: ["Dumbbell Bent-Over Row", "Dumbbell Reverse Fly"],
    Barbell: ["Barbell Bent-Over Row"],
    Machine: ["T Bar Row", "Machine Reverse Fly", "Machine Row"],
    Cable: ["Cable Row", "Cable Reverse Fly"],
  },
  "Rotator Cuff": {
    Bodyweight: ["Ring Face Pull"],
    "Resistance Bands": [
      "Band External Shoulder Rotation",
      "Band Internal Shoulder Rotation",
      "Band Face Pull",
    ],
    Dumbbell: [
      "Side-lying External Rotation",
      "Side-lying Internal Rotation",
      "Dumbbell Lu Raise",
    ],
    Barbell: ["Barbell Overhead Press"],
    Machine: ["Machine Overhead Press"],
    Cable: [
      "Cable Face Pull",
      "Cable External Shoulder Rotation",
      "Cable Internal Shoulder Rotation",
    ],
  },
  Abs: {
    Bodyweight: ["Crunch", "Leg Raise", "Hollow Body Hold", "Ring Roll-out"],
    "Resistance Bands": ["Band Resisted Crunch", "Band Resisted Leg Raise"],
    Dumbbell: ["Weighted Crunch", "Weighted Hollow Body Hold"],
    Barbell: [
      "Barbell Ab Roll-out",
      "Weighted Crunch",
      "Weighted Hollow Body Hold",
    ],
    Machine: ["Ab Crunch Machine"],
    Cable: ["Cable Crunch"],
  },
  Obliques: {
    Bodyweight: [
      "Russian Twist",
      "Windshield Wiper",
      "Side Plank",
      "Hanging Oblique Raise",
      "Oblique Crunch",
    ],
    "Resistance Bands": [
      "Band Woodchopper",
      "Band Pallof Press",
      "Band Oblique Crunch",
    ],
    Dumbbell: [
      "Weighted Side Plank",
      "Weighted Russian Twist",
    ],
    Barbell: ["Barbell Tight Twist"],
    Machine: ["Oblique Twist Machine"],
    Cable: ["Cable Woodchopper", "Cable Pallof Press", "Cable Oblique Crunch"],
  },
  "Spinal Erectors": {
    Bodyweight: [
      "Reverse Hyperextension",
      "Inverted Deadlift",
      "Bird Dog",
      "Back Extension",
      "Jefferson Curl",
      "Back Bridge",
    ],
    "Resistance Bands": ["Band Deadlift"],
    Dumbbell: [
      "Weighted Bird Dog",
      "Weighted Back Extension",
      "Weighted Jefferson Curl",
    ],
    Barbell: ["Weighted Jefferson Curl", "Good Morning"],
    Machine: [
      "Back Extension Machine",
      "Reverse Hyperextension Machine",
      "45 Degree Back Raise",
      "Smith Machine Good Morning",
    ],
    Cable: [],
  },
  "Transverse Abdominis": {
    Bodyweight: ["Dead Bug", "Hollow Body Hold", "Bird Dog", "Plank"],
    "Resistance Bands": [],
    Dumbbell: [
      "Weighted Dead Bug",
      "Weighted Hollow Body Hold",
      "Weighted Bird Dog",
    ],
    Barbell: ["Weighted Hollow Body Hold"],
    Machine: [],
    Cable: [],
  },
  Glutes: {
    Bodyweight: ["Glute Bridge", "Hip Thrust", "Squat", "Lunge"],
    "Resistance Bands": [
      "Band Resisted Squat",
      "Band Kickback",
      "Band Glute Med Kickback",
      "Band-resisted Deadlift",
      "Band-resisted Romanian Deadlift",
    ],
    Dumbbell: [
      "Dumbbell Romanian Deadlift",
      "Dumbbell (Single Leg) Hip Thrust",
      "Weighted Forward Lunge",
      "Goblet Squat",
    ],
    Barbell: [
      "Barbell Romanian Deadlift",
      "Barbell Back Squat",
      "Deadlift",
      "Hip Thrust",
    ],
    Machine: [
      "Smith Machine Bulgarian Split Squat",
      "Glute Kickback Machine",
      "Leg Press",
      "Hip Thrust Machine",
    ],
    Cable: ["Cable Kickback", "Cable Glute Med Kickback"],
  },
  Abductors: {
    Bodyweight: [
      "Side Plank",
      "Peeing Dog",
      "Split Squat",
      "Side-lying Leg Raise",
    ],
    "Resistance Bands": ["Band Resisted Split Squat", "Band Hip Abduction"],
    Dumbbell: ["Weighted Side Plank", "Dumbbell Split Squat"],
    Barbell: ["Barbell Split Squat"],
    Machine: ["Smith Machine Split Squat", "Abductor Machine"],
    Cable: ["Cable Hip Abduction"],
  },
  "Hip Flexors": {
    Bodyweight: ["Leg Raise", "Pike Pulse", "Deep Lunge"],
    "Resistance Bands": [
      "Band Resisted Hanging Leg Raise",
      "Band Resisted Deep Lunge",
    ],
    Dumbbell: ["Weighted Deep Lunge"],
    Barbell: ["Weighted Deep Lunge"],
    Machine: ["Hip Flexor Machine", "Smith Machine Deep Lunge"],
    Cable: ["Cable Leg Raise"],
  },
  Hamstrings: {
    Bodyweight: ["Hamstring Slide", "Nordic Curl"],
    "Resistance Bands": [
      "Band Resisted Lying Hamstring Curl",
      "Band Resisted Sitting Hamstring Curl",
      "Band Resisted Straight Legged Deadlift",
    ],
    Dumbbell: ["Dumbbell Straight Legged Deadlift"],
    Barbell: ["Barbell Straight Legged Deadlift"],
    Machine: [
      "Lying Hamstring Curl Machine",
      "Sitting Hamstring Curl Machine",
      "Smith Machine Straight Legged Deadlift",
    ],
    Cable: ["Standing Cable Hamstring Curl", "Lying Cable Hamstring Curl"],
  },
  Quadriceps: {
    Bodyweight: ["Squat", "Split Squat", "Sissy Squat", "Reverse Nordic"],
    "Resistance Bands": ["Band Resisted Squat", "Band Resisted Leg Extension"],
    Dumbbell: ["Weighted Split Squat", "Goblet Squat"],
    Barbell: ["Weighted Split Squat", "Front Squat", "Back Squat"],
    Machine: [
      "Leg Extension Machine",
      "Pendulum Squat",
      "Hack Squat",
      "Leg Press",
      "Smith Machine Squat",
    ],
    Cable: ["Cable Leg Extension"],
  },
  Adductors: {
    Bodyweight: [
      "Cossack Squat",
      "Copenhagen Plank",
      "Deep Squat",
      "Sumo Squat",
    ],
    "Resistance Bands": ["Band Hip Adduction"],
    Dumbbell: [
      "Weighted Cossack Squat",
      "Weighted Copenhagen Plank",
      "Weighted Deep Squat",
      "Sumo Squat",
    ],
    Barbell: [
      "Weighted Cossack Squat",
      "Weighted Deep Squat",
      "Barbell Sumo Squat",
      "Sumo Deadlift",
    ],
    Machine: ["Adductor Machine", "Hack Squat", "Leg Press"],
    Cable: ["Cable Hip Adduction"],
  },
  Calves: {
    Bodyweight: [
      "Straight Leg Calf Raise",
      "Bent Knee Calf Raise",
      "Nordic Curl",
    ],
    "Resistance Bands": [
      "Band Resisted Straight Leg Calf Raise",
      "Band Resisted Bent Knee Calf Raise",
    ],
    Dumbbell: [
      "Dumbbell Straight Leg Calf Raise",
      "Dumbbell Bent Knee Calf Raise",
    ],
    Barbell: [
      "Barbell Straight Leg Calf Raise",
      "Barbell Bent Knee Calf Raise",
    ],
    Machine: [
      "Barbell Straight Leg Calf Raise",
      "Barbell Bent Knee Calf Raise",
    ],
    Cable: [
      "Cable Resisted Straight Leg Calf Raise",
      "Cable Resisted Bent Knee Calf Raise",
    ],
  },
  Tibialis: {
    Bodyweight: ["Wall Toe Raise", "Seated Toe Raise", "Heel Walk"],
    "Resistance Bands": ["Band Resisted Toe Raise"],
    Dumbbell: ["Weighted Wall Toe", "Weighted Seated Toe Raise"],
    Barbell: ["Weighted Wall Toe Raise", "Weighted Seated Toe Raise"],
    Machine: ["Tibialis Anterior Machine"],
    Cable: ["Cable Toe Raise"],
  },
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Bodyweight HC moves that require a pull-up bar (not floor-only). */
const PULL_UP_BAR_NAMES = new Set([
  "Chin Up",
  "Pullup",
  "Commando Pullup",
  "Dead hang",
  "Hanging Oblique Raise",
  "Band Resisted Hanging Leg Raise",
  "Row",
  "Front Lever Raise",
  "Elbow Press",
]);

const PULL_UP_BAR_MULTI = {
  "Band Resisted Hanging Leg Raise": ["pull_up_bar", "resistance_band"],
};

/** Bench, box, or sturdy chair/couch for anchoring or elevation. */
const PLYO_BOX_NAMES = new Set([
  "Decline Pushup",
  "Sissy Squat",
]);

const BENCH_NAMES = new Set([
  "Copenhagen Plank",
  "Nordic Curl",
  "Reverse Nordic",
]);

const DIP_NAMES = new Set(["Dip"]);

/** Inverted hang or box/chair shrug - not floor-only bodyweight. */
const INVERTED_SHRUG_NAMES = new Set(["Upside Down Shrug"]);

/** HC "bodyweight" moves that require gymnastic rings (name has no "ring"). */
const RINGS_BODYWEIGHT_NAMES = new Set(["Pelican Curl"]);

function inferEquipmentList(name, baseEquip) {
  if (PULL_UP_BAR_MULTI[name]) return PULL_UP_BAR_MULTI[name];
  if (baseEquip === "bodyweight" && DIP_NAMES.has(name)) {
    return ["pull_up_bar", "rings"];
  }
  if (baseEquip === "bodyweight" && BENCH_NAMES.has(name)) {
    return ["bench"];
  }
  if (baseEquip === "bodyweight" && PLYO_BOX_NAMES.has(name)) {
    return ["bench", "plyo_box"];
  }
  if (baseEquip === "bodyweight" && RINGS_BODYWEIGHT_NAMES.has(name)) {
    return ["rings"];
  }
  if (baseEquip === "bodyweight" && /\brings?\b/i.test(name)) {
    return ["rings"];
  }
  if (baseEquip === "bodyweight" && PULL_UP_BAR_NAMES.has(name)) {
    return ["pull_up_bar"];
  }
  if (baseEquip === "bodyweight" && INVERTED_SHRUG_NAMES.has(name)) {
    return ["pull_up_bar", "rings", "bench"];
  }
  if (baseEquip === "machine") {
    const expected = expectedEquipmentFromName(name);
    const specific = expected.find((tag) => isStrengthMachineTag(tag));
    if (specific) return [specific];
    if (expected.includes("barbell") || /\bbarbell\b/i.test(name)) {
      return ["barbell"];
    }
    throw new Error(`Unmapped machine exercise: ${name}`);
  }
  return [baseEquip];
}

function isTimeBased(name) {
  return /\b(hold|plank|hang|slide)\b/i.test(name);
}

/** @type {Map<string, { name: string; equipment: string; category: string; muscleGroups: Set<string> }>} */
const byKey = new Map();

for (const [muscle, sections] of Object.entries(PAGES)) {
  const category = MUSCLE_TO_CATEGORY[muscle];
  if (!category) throw new Error(`No category for ${muscle}`);

  for (const [section, names] of Object.entries(sections)) {
    const baseEquip = SECTION_TO_EQUIPMENT[section];
    if (!baseEquip) throw new Error(`Unknown section ${section} on ${muscle}`);

    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const equipment = inferEquipmentList(trimmed, baseEquip);
      const key = `${slugify(trimmed)}|${equipment.join("+")}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          name: trimmed,
          equipment,
          category: NAME_CATEGORY_OVERRIDES[trimmed] ?? category,
          muscleGroups: new Set(),
        };
        byKey.set(key, entry);
      } else if (NAME_CATEGORY_OVERRIDES[trimmed]) {
        entry.category = NAME_CATEGORY_OVERRIDES[trimmed];
      }
      entry.muscleGroups.add(muscle);
      // Prefer more specific category if conflict (keep first)
    }
  }
}

const sorted = [...byKey.values()].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

let seq = 1;
const lines = sorted.map((e) => {
  const id = `HC-${String(seq++).padStart(3, "0")}`;
  const muscleGroups = [...e.muscleGroups].sort();
  const timeBased = isTimeBased(e.name);
  const baseReps = timeBased ? "30 sec" : "10";
  const defaultReps = eachQualifier(e.name, baseReps, timeBased);
  const notes = generateHcNote(e.name, e.category);
  const muscleGroupsJson = JSON.stringify(muscleGroups);

  return `\t{
\t\tid: ${JSON.stringify(id)},
\t\tname: ${JSON.stringify(e.name)},
\t\tcategory: ${JSON.stringify(e.category)},
\t\tequipment: ${JSON.stringify(e.equipment)},
\t\tmuscleGroups: ${muscleGroupsJson},
\t\tdefaultReps: ${JSON.stringify(defaultReps)},
\t\tnotes: ${JSON.stringify(notes)},
\t\tsource: "Hybrid Calisthenics",
\t\tvideoUrl: undefined,
\t\tisTimeBased: ${timeBased},
\t},`;
});

const file = `// AUTO-GENERATED by scripts/generate-hybrid-calisthenics-exercises.mjs - do not edit by hand.
// Source: https://www.hybridcalisthenics.com/exercise-library

import type { Exercise } from "@/types";

export const hybridCalisthenicsExercises: Exercise[] = [
${lines.join("\n")}
];
`;

writeFileSync(OUT, file, "utf8");
console.log(`Wrote ${sorted.length} exercises to ${OUT}`);

const prune = join(__dirname, "prune-consolidated-exercises.mjs");
const pr = spawnSync(process.execPath, [prune], {
  stdio: "inherit",
  cwd: join(__dirname, ".."),
});
if (pr.status !== 0) process.exit(pr.status ?? 1);
