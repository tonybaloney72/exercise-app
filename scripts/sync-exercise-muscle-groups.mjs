/**
 * Re-sync muscleGroups on catalog + hybrid exercises from category defaults and name rules.
 * Run: node scripts/sync-exercise-muscle-groups.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  ROOT,
  parseExercisesFromText,
} from "./lib/catalog-parse.mjs";
import {
  muscleGroupsEqual,
  resolveMuscleGroups,
} from "./lib/category-muscle-groups.mjs";

const TARGETS = [
  {
    file: "src/core/catalog/data/exercises.ts",
    source: "catalog",
    startMarker: "const catalogExercises: Exercise[] = [",
    endBefore: "export const exercises",
    blockRe: /\n  \{[\s\S]*?\n  \},/g,
  },
  {
    file: "src/core/catalog/data/hybridCalisthenicsExercises.ts",
    source: "hybrid",
    startMarker: "export const hybridCalisthenicsExercises: Exercise[] = [",
    endBefore: null,
    blockRe: /\n  \{[\s\S]*?\n  \},/g,
  },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMuscleGroupsField(block, indent) {
  const labelRe = new RegExp(`\\n${escapeRegExp(indent)}muscleGroups:`);
  const labelMatch = labelRe.exec(block);
  if (!labelMatch) return null;

  const fieldStart = labelMatch.index;
  const arrayStart = block.indexOf("[", labelMatch.index);
  if (arrayStart === -1) return null;

  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < block.length; i += 1) {
    const char = block[i];
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return null;

  let fieldEnd = arrayEnd + 1;
  while (fieldEnd < block.length && /[\s,]/.test(block[fieldEnd])) {
    fieldEnd += 1;
  }

  const orphanRe = new RegExp(
    `(?:\\n${escapeRegExp(indent)}\\s+"[^"]+",)*\\n${escapeRegExp(indent)}\\],,?`,
  );
  const orphanMatch = orphanRe.exec(block.slice(fieldEnd));
  if (orphanMatch) {
    fieldEnd += orphanMatch[0].length;
  }

  return {
    fieldStart,
    fieldEnd,
    arrayText: block.slice(arrayStart, arrayEnd + 1),
  };
}

function parseMuscleGroupsLine(block, indent = block.match(/\n(\s+)id:/)?.[1] ?? "    ") {
  const field = findMuscleGroupsField(block, indent);
  if (!field) return [];

  const items = [];
  const itemRe = /"([^"]+)"/g;
  let match;
  while ((match = itemRe.exec(field.arrayText)) !== null) items.push(match[1]);
  return items;
}

function formatMuscleGroups(muscleGroups) {
  return `[${muscleGroups.map((m) => JSON.stringify(m)).join(", ")}]`;
}

function upsertMuscleGroups(block, muscleGroups) {
  const indent = block.match(/\n(\s+)id:/)?.[1] ?? "    ";
  const json = formatMuscleGroups(muscleGroups);
  const line = `\n${indent}muscleGroups: ${json},`;
  const field = findMuscleGroupsField(block, indent);

  if (field) {
    return block.slice(0, field.fieldStart) + line + block.slice(field.fieldEnd);
  }

  const afterEquipment = new RegExp(
    `(\\n${indent}equipment: [^\\n]+,\\n)`,
    "m",
  );
  if (afterEquipment.test(block)) {
    return block.replace(afterEquipment, `$1${line.slice(1)}\n`);
  }

  return block.replace(
    new RegExp(`(\\n${indent}category: "[^"]+",\\n)`),
    `$1${line.slice(1)}\n`,
  );
}

function syncFile(target) {
  const path = join(ROOT, target.file);
  let content = readFileSync(path, "utf8").replace(/\r\n/g, "\n");

  let sectionStart = 0;
  let sectionEnd = content.length;
  if (target.startMarker) {
    sectionStart = content.indexOf(target.startMarker);
    if (sectionStart === -1) {
      throw new Error(`Could not find ${target.startMarker} in ${target.file}`);
    }
    sectionStart += target.startMarker.length;
  }
  if (target.endBefore) {
    const endIdx = content.indexOf(target.endBefore, sectionStart);
    if (endIdx === -1) {
      throw new Error(`Could not find ${target.endBefore} in ${target.file}`);
    }
    sectionEnd = content.lastIndexOf("];", endIdx);
    if (sectionEnd === -1 || sectionEnd <= sectionStart) {
      throw new Error(`Could not find catalog array end in ${target.file}`);
    }
  } else {
    sectionEnd = content.lastIndexOf("];");
  }

  const parsed = parseExercisesFromText(content, target.file);
  const byId = new Map(parsed.map((row) => [row.id, row]));

  let changed = 0;
  const section = content.slice(sectionStart, sectionEnd);
  const updatedSection = section.replace(target.blockRe, (block) => {
    const id = block.match(/^\s*id:\s*"([^"]+)"/m)?.[1];
    if (!id) return block;

    const meta = byId.get(id);
    if (!meta?.name || !meta.category) return block;

    const existing = parseMuscleGroupsLine(block);
    const next = resolveMuscleGroups({
      name: meta.name,
      category: meta.category,
      secondaryCategory: meta.secondaryCategory,
      existingMuscleGroups: existing,
      source: target.source,
    });

    const formatted = formatMuscleGroups(next);
    const expectedField = `muscleGroups: ${formatted},`;

    if (muscleGroupsEqual(existing, next) && block.includes(expectedField)) {
      return block;
    }
    changed += 1;
    return upsertMuscleGroups(block, next);
  });

  if (changed > 0) {
    content =
      content.slice(0, sectionStart) + updatedSection + content.slice(sectionEnd);
    writeFileSync(path, content, "utf8");
  }

  return changed;
}

let total = 0;
for (const target of TARGETS) {
  const count = syncFile(target);
  total += count;
  console.log(`${target.file}: updated ${count} exercise(s)`);
}
console.log(`Done. ${total} muscleGroups field(s) updated.`);
