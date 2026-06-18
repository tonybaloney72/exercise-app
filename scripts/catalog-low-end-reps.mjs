/**
 * Collapse defaultReps ranges to the low end (e.g. "10–13" → "10", "20–30 sec" → "20 sec").
 * Run: node scripts/catalog-low-end-reps.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TARGET = join(ROOT, "src/core/catalog/data/exercises.ts");

function lowEndReps(value) {
  return value.replace(
    /(\d+(?:\.\d+)?)\s*[–-]\s*\d+(?:\.\d+)?/g,
    "$1",
  );
}

const text = readFileSync(TARGET, "utf8");
let changes = 0;
const next = text.replace(/defaultReps:\s*"([^"]*)"/g, (match, reps) => {
  const collapsed = lowEndReps(reps);
  if (collapsed === reps) return match;
  changes += 1;
  return `defaultReps: "${collapsed}"`;
});

if (changes > 0) {
  writeFileSync(TARGET, next);
}
console.log(`Updated ${changes} defaultReps in exercises.ts`);
