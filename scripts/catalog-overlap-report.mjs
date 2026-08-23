import { readFileSync } from "fs";
import { CATALOG_SOURCES, parseExercisesFromText } from "./lib/catalog-parse.mjs";

const all = [];
for (const src of CATALOG_SOURCES) {
  const text = readFileSync(src.file, "utf8");
  all.push(...parseExercisesFromText(text, src.file));
}

function norm(s) {
  return s
    .toLowerCase()
    .replace(/push-?ups?/g, "pushup")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripModifiers(name) {
  return norm(name)
    .replace(
      /\b(with rotation|overhead reach|deep|forward|reverse|walking|lateral|band resisted|band-resisted|dumbbell|barbell|cable|smith machine|weighted|knee|straight leg|bent knee|single leg|close grip|decline|incline|pseudo planche|handstand|medicine ball)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

const byNorm = new Map();
for (const ex of all) {
  const k = norm(ex.name);
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(ex);
}

const families = [
  "lunge",
  "high knee",
  "calf raise",
  "pushup",
  "glute bridge",
  "donkey kick",
  "jumping jack",
  "squat",
  "dead bug",
  "plank",
];

const familyGroups = new Map();
for (const f of families) familyGroups.set(f, []);
for (const ex of all) {
  const n = norm(ex.name);
  for (const f of families) {
    if (n.includes(f)) familyGroups.get(f).push(ex);
  }
}

const sw = all.filter((e) => e.category === "SW");
const catalog = all.filter((e) => e.sourceFile.includes("exercises.ts"));

console.log(JSON.stringify({
  swExerciseLike: sw
    .filter((e) =>
      ["LB", "PC", "UP", "UPL", "CF", "CL", "CR", "CS"].includes(
        e.secondaryCategory,
      ),
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      secondary: e.secondaryCategory,
      defaultReps: e.defaultReps,
    })),
  exactNormalizedDupes: [...byNorm.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => ({
      normalizedName: k,
      rows: v.map((ex) => ({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        file: ex.sourceFile.split("/").pop(),
      })),
    })),
  familyClusters: Object.fromEntries(
    [...familyGroups.entries()].map(([f, list]) => [
      f,
      list
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((ex) => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          secondary: ex.secondaryCategory ?? null,
          defaultReps: ex.defaultReps,
          file: ex.sourceFile.split("/").pop(),
        })),
    ]),
  ),
  proposedMergeCandidates: [
    {
      group: "Forward / walking / generic lunge",
      keep: "LB-2 Forward Lunges (canonical bilateral alternating)",
      review: [
        "LB-2975 Walking Lunges",
        "CR-? Walking Lunge with Rotation",
        "HC-202 Lunge",
        "HC-1826 Deep Lunge",
        "HC-444 Band Resisted Deep Lunge",
      ],
      note: "Consolidate to 2–3: forward, reverse, walking (with rotation stays CR if kept)",
    },
    {
      group: "High knees",
      keep: "PC-5 High Knees (strength/cardio rounds)",
      removeFromWarm: "SW-39 High Knee with Overhead Reach",
      note: "Drop SW row; optionally add PC-5 to crossover with lower warm dose in stretch resolver",
    },
    {
      group: "Standing straight-leg calf raise",
      keep: "HC-261 Straight Leg Calf Raise",
      removed: ["LB-6 Standing Calf Raise"],
      note: "Consolidated Aug 2026; LB-6 migrates to HC-261 on load",
    },
    {
      group: "Standard push-up",
      keep: "Catalog push-up progression chain",
      review: ["HC-2971 Pushup"],
      note: "Rename HC to Push-Up; dedupe only if notes/video match",
    },
  ],
}, null, 2));
