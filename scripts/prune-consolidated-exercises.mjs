/**
 * Removes consolidated exercise objects from source files (whole `{ … },` blocks).
 * Run: node scripts/prune-consolidated-exercises.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const REMOVED_HC = new Set([
  "HC-131", "HC-178", "HC-192", "HC-122", "HC-132", "HC-185", "HC-176", "HC-084",
  "HC-241", "HC-244", "HC-299", "HC-263", "HC-264",
  "HC-062", "HC-077", "HC-083", "HC-175", "HC-190", "HC-228", "HC-277", "HC-279", "HC-282",
  "HC-284", "HC-286", "HC-288", "HC-292", "HC-295",
  // Pure load variants → canonical (Jul 2026)
  "HC-030", "HC-038", "HC-040", "HC-056", "HC-061", "HC-075", "HC-076",
  "HC-109", "HC-110", "HC-142", "HC-159", "HC-164", "HC-165", "HC-289", "HC-294",
  "HC-296", "HC-290",
]);

const REMOVED_SW = new Set(["SW-15", "SW-17", "SW-20", "SW-25"]);

const REMOVED_LB = new Set([
  "LB-12", "LB-13", "LB-14", "LB-15", "LB-16", "LB-17",
]);

/** @param {string} text @param {Set<string>} removedIds */
function removeExerciseBlocks(text, removedIds) {
  const blockRe = /\t\{\n\t\tid: "([^"]+)"[\s\S]*?\n\t\},/g;
  return text.replace(blockRe, (match, id) => (removedIds.has(id) ? "" : match));
}

const hybridPath = "src/core/catalog/data/hybridCalisthenicsExercises.ts";
let hybrid = readFileSync(hybridPath, "utf8");
const beforeH = (hybrid.match(/^\s*id:/gm) || []).length;
hybrid = removeExerciseBlocks(hybrid, REMOVED_HC);
const afterH = (hybrid.match(/^\s*id:/gm) || []).length;

const catalogPath = "src/core/catalog/data/exercises.ts";
let catalog = readFileSync(catalogPath, "utf8");
const hybridImport = catalog.indexOf("import { hybridCalisthenicsExercises }");
const catalogOnly = catalog.slice(0, hybridImport);
const afterHybrid = catalog.slice(hybridImport);
const beforeC = (catalogOnly.match(/^\s*id:/gm) || []).length;
const catalogFiltered = removeExerciseBlocks(
  catalogOnly,
  new Set([...REMOVED_SW, ...REMOVED_LB]),
);
const afterC = (catalogFiltered.match(/^\s*id:/gm) || []).length;
writeFileSync(catalogPath, catalogFiltered + afterHybrid);

writeFileSync(hybridPath, hybrid);

console.log(`Hybrid: ${beforeH} -> ${afterH} exercises (removed ${beforeH - afterH})`);
console.log(`Catalog: ${beforeC} -> ${afterC} exercises (removed ${beforeC - afterC})`);
