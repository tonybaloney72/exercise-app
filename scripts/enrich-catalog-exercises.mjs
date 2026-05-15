/**
 * Adds `equipment` and `muscleGroups` to each catalog exercise in exercises.ts.
 * Ensures catalog + hybrid merge export when missing.
 * Run: node scripts/enrich-catalog-exercises.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXERCISES = join(__dirname, "../src/data/exercises.ts");

/** Aligns with Hybrid Calisthenics muscle tags where applicable. */
const CATEGORY_MUSCLE_GROUPS = {
  CF: ["Abs"],
  CL: ["Hip Flexors", "Abs"],
  CR: ["Obliques"],
  CS: ["Transverse Abdominis", "Spinal Erectors"],
  UP: ["Chest", "Front Deltoids", "Triceps"],
  UPL: ["Lats", "Rhomboids", "Rear Deltoids", "Biceps"],
  LB: ["Quadriceps", "Hamstrings", "Glutes", "Calves"],
  CP: ["Quadriceps", "Glutes"],
  SW: ["Mobility"],
  SC: ["Mobility"],
};

function muscleGroupsFor(primary, secondary) {
  const set = new Set(CATEGORY_MUSCLE_GROUPS[primary] ?? []);
  if (secondary) {
    for (const m of CATEGORY_MUSCLE_GROUPS[secondary] ?? []) set.add(m);
  }
  return [...set].sort();
}

function equipmentFor(name) {
  if (/\bring\b/i.test(name)) return ["rings"];
  if (
    /\b(pull-?up|chin-?up|dead hang|inverted row|hanging|toes to bar|front lever)\b/i.test(
      name,
    )
  ) {
    return ["pull_up_bar"];
  }
  if (/\b(swiss ball|bosu)\b/i.test(name)) return ["stability_ball"];
  if (/\b(medicine ball|med ball)\b/i.test(name)) return ["medicine_ball"];
  if (/\b(plyo|box jump|step-?up)\b/i.test(name) && /\bbox\b/i.test(name)) {
    return ["plyo_box"];
  }
  if (/\bband\b/i.test(name)) return ["resistance_band"];
  return ["bodyweight"];
}

function enrichObject(block) {
  if (block.includes("equipment:")) return block;

  const cat = block.match(/category: "(\w+)"/)?.[1];
  const secondary = block.match(/secondaryCategory: "(\w+)"/)?.[1];
  const name = block.match(/name: "([^"]+)"/)?.[1] ?? "";

  if (!cat) return block;

  const equipment = equipmentFor(name);
  const muscleGroups = muscleGroupsFor(cat, secondary);
  const insert = [
    `\t\tequipment: ${JSON.stringify(equipment)},`,
    `\t\tmuscleGroups: ${JSON.stringify(muscleGroups)},`,
  ].join("\r\n");

  return block.replace(
    /(\r?\n\t\tcategory: "[^"]+",)\r?\n/,
    `$1\r\n${insert}\r\n`,
  );
}

function enrichCatalogSection(middle) {
  return middle.replace(/\t\{[\s\S]*?\r?\n\t\},/g, enrichObject);
}

function ensureHybridMerge(content) {
  if (content.includes("hybridCalisthenicsExercises")) return content;

  if (!content.includes('import { hybridCalisthenicsExercises }')) {
    content = content.replace(
      'import type { Exercise } from "@/types";',
      'import type { Exercise } from "@/types";\nimport { hybridCalisthenicsExercises } from "./hybridCalisthenicsExercises";',
    );
  }

  if (content.includes("const catalogExercises:")) return content;

  content = content.replace(
    "export const exercises: Exercise[] = [",
    "const catalogExercises: Exercise[] = [",
  );

  content = content.replace(
    /(\];)\n\nexport const exerciseMap/,
    `];

export const exercises: Exercise[] = [
\t...catalogExercises,
\t...hybridCalisthenicsExercises,
];

export const exerciseMap`,
  );

  return content;
}

let content = readFileSync(EXERCISES, "utf8");
content = ensureHybridMerge(content);

const catalogMarker = "const catalogExercises: Exercise[] = [";
const catalogStart = content.indexOf(catalogMarker);
if (catalogStart === -1) {
  throw new Error("Could not find catalogExercises array in exercises.ts");
}

const exercisesExport = content.indexOf("export const exercises", catalogStart);
if (exercisesExport === -1) {
  throw new Error("Could not find export const exercises in exercises.ts");
}
const catalogEnd = content.lastIndexOf("];", exercisesExport);
if (catalogEnd === -1 || catalogEnd <= catalogStart) {
  throw new Error("Could not find end of catalogExercises array");
}

const before = content.slice(0, catalogStart + catalogMarker.length);
const middle = content.slice(catalogStart + catalogMarker.length, catalogEnd);
const after = content.slice(catalogEnd);

const updated = before + enrichCatalogSection(middle) + after;
writeFileSync(EXERCISES, updated, "utf8");
console.log("Enriched catalog exercises in exercises.ts");
