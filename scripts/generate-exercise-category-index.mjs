/**
 * Writes src/data/exerciseCategoryIndex.ts from catalog sources.
 * Run: npm run generate:category-index
 *
 * Required after any exercise id or category change in catalog TS files.
 * See docs/catalog-maintenance.md
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  CATALOG_SOURCES,
  parseExercisesFromText,
  ROOT,
} from "./lib/catalog-parse.mjs";

const entries = [];
for (const { file } of CATALOG_SOURCES) {
  const text = readFileSync(join(ROOT, file), "utf8");
  entries.push(...parseExercisesFromText(text, file));
}

/** @type {Record<string, string>} */
const map = {};
for (const ex of entries) {
  if (!ex.id || !ex.category) continue;
  map[ex.id] = ex.category;
  if (ex.id.startsWith("PC-")) {
    const legacyId = `CP-${ex.id.slice(3)}`;
    if (!map[legacyId]) map[legacyId] = ex.category;
  }
}

const sorted = Object.keys(map).sort();
const lines = sorted.map((id) => `  "${id}": "${map[id]}",`);

const out = `import type { ExerciseCategory } from "@/types";

/**
 * Slim id → category map for progress stats.
 * GENERATED — do not edit by hand. Run: npm run generate:category-index
 * See docs/catalog-maintenance.md
 */
export const exerciseCategoryById: Record<string, ExerciseCategory> = {
${lines.join("\n")}
};
`;

writeFileSync(join(ROOT, "src/data/exerciseCategoryIndex.ts"), out, "utf8");
console.log(`Wrote exerciseCategoryIndex.ts (${sorted.length} ids)`);
