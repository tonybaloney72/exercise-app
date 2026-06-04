/**
 * Parse / patch exercise objects in catalog TypeScript data files.
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "../..");

/** IDs with minimal catalog metadata (cardio logging only; skip media audit). */
const CATALOG_AUDIT_EXEMPT_ID_PREFIXES = ["END-"];

export function isCatalogAuditExempt(exercise) {
  const id = exercise?.id ?? "";
  return CATALOG_AUDIT_EXEMPT_ID_PREFIXES.some((p) => id.startsWith(p));
}

export const CATALOG_SOURCES = [
  { file: "src/data/exercises.ts", label: "catalog", blockPrefix: "\t{" },
  { file: "src/data/enduranceExercises.ts", label: "endurance", blockPrefix: "  {" },
  { file: "src/data/hybridCalisthenicsExercises.ts", label: "hybrid", blockPrefix: "\t{" },
];

function parseEquipmentLine(line) {
  const m = line.match(/^\s*equipment:\s*\[([^\]]*)\]/);
  if (!m) return null;
  const inner = m[1].trim();
  if (!inner) return [];
  const items = [];
  const itemRe = /"([^"]+)"/g;
  let im;
  while ((im = itemRe.exec(inner)) !== null) items.push(im[1]);
  return items;
}

/**
 * Parse `field: "value"` or `field:\n  "value"` (common in exercises.ts).
 * @returns {{ value: string | null, explicit: boolean, consumedNext: boolean } | null}
 */
export function parseQuotedStringField(line, nextLine, fieldName) {
  const key = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^\\s*${key}:\\s*undefined`).test(line)) {
    return { value: null, explicit: true, consumedNext: false };
  }
  const single = line.match(new RegExp(`^\\s*${key}:\\s*"([^"]*)"`));
  if (single) {
    return { value: single[1], explicit: true, consumedNext: false };
  }
  if (new RegExp(`^\\s*${key}:\\s*$`).test(line) && nextLine) {
    const multi = nextLine.match(/^\s*"([^"]*)"\s*,?\s*$/);
    if (multi) {
      return { value: multi[1], explicit: true, consumedNext: true };
    }
  }
  return null;
}

export function parseExercisesFromText(text, sourceFile) {
  const entries = [];
  let cur = null;
  const lines = text.split("\n");

  const flush = () => {
    if (!cur?.id) return;
    entries.push(cur);
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] ?? "";

    const idM = line.match(/^\s*id:\s*"([^"]+)"/);
    if (idM) {
      flush();
      cur = {
        sourceFile,
        id: idM[1],
        name: null,
        category: null,
        secondaryCategory: null,
        equipment: null,
        videoUrl: null,
        hasVideoField: false,
        sourceLabel: null,
        expertiseLevel: null,
        hasExpertiseField: false,
        notes: null,
        isTimeBased: false,
        blockStart: null,
        blockEnd: null,
      };
      continue;
    }
    if (!cur) continue;

    const nameM = line.match(/^\s*name:\s*"([^"]+)"/);
    if (nameM) cur.name = nameM[1];

    const catM = line.match(/^\s*category:\s*"([^"]+)"/);
    if (catM) cur.category = catM[1];

    const secM = line.match(/^\s*secondaryCategory:\s*"([^"]+)"/);
    if (secM) cur.secondaryCategory = secM[1];

    const equip = parseEquipmentLine(line);
    if (equip !== null) cur.equipment = equip;

    const video = parseQuotedStringField(line, nextLine, "videoUrl");
    if (video) {
      cur.videoUrl = video.value;
      cur.hasVideoField = true;
      if (video.consumedNext) i += 1;
    }

    const src = parseQuotedStringField(line, nextLine, "source");
    if (src) {
      cur.sourceLabel = src.value;
      if (src.consumedNext) i += 1;
    }

    const notes = parseQuotedStringField(line, nextLine, "notes");
    if (notes) {
      cur.notes = notes.value;
      if (notes.consumedNext) i += 1;
    }

    const expM = line.match(/^\s*expertiseLevel:\s*"([^"]+)"/);
    if (expM) {
      cur.expertiseLevel = expM[1];
      cur.hasExpertiseField = true;
    }

    if (/^\s*isTimeBased:\s*true/.test(line)) cur.isTimeBased = true;
  }
  flush();
  return entries;
}

export function loadAllExercises() {
  const all = [];
  for (const { file, label } of CATALOG_SOURCES) {
    const path = join(ROOT, file);
    const text = readFileSync(path, "utf8");
    const parsed = parseExercisesFromText(text, file);
    for (const e of parsed) {
      e.sourceLabelKind = label;
      all.push(e);
    }
  }
  return all;
}

function blockRegexForFile(filePath) {
  if (filePath.includes("endurance")) {
    return /\n  \{[\s\S]*?\n  \},/g;
  }
  if (filePath.includes("hybrid")) {
    return /\n\t\{[\s\S]*?\n\t\},/g;
  }
  return /\n  \{[\s\S]*?\n  \},/g;
}

/** Index exercise blocks by id for in-file replacement. */
function indexBlocksById(text, blockRe) {
  const map = new Map();
  let m;
  const re = blockRe ?? /\n  \{[\s\S]*?\n  \},|\n\t\{[\s\S]*?\n\t\},/g;
  while ((m = re.exec(text)) !== null) {
    const block = m[0];
    const idM = block.match(/^\s*id:\s*"([^"]+)"/m);
    if (idM) map.set(idM[1], { block, index: m.index, length: block.length });
  }
  return { text, map };
}

export function normalizeExerciseName(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Match catalog name to HC progression map (plural / punctuation tolerant). */
export function lookupHcProgression(byNormalized, exerciseName) {
  const norm = normalizeExerciseName(exerciseName);
  if (byNormalized[norm]) return byNormalized[norm];
  if (norm.endsWith("s") && byNormalized[norm.slice(0, -1)]) {
    return byNormalized[norm.slice(0, -1)];
  }
  if (byNormalized[`${norm}s`]) return byNormalized[`${norm}s`];
  return null;
}

/** Leading whitespace before `id:` inside an exercise block. */
function blockIndent(block) {
  const m = block.match(/\n(\s+)id:/);
  if (m) return m[1];
  return block.includes("\n\t\t") ? "\t\t" : "  ";
}

function upsertField(block, fieldName, value, { afterField = "category" } = {}) {
  const indent = blockIndent(block);

  const fieldLineRe = new RegExp(`\\n${indent}${fieldName}:.*`, "m");

  if (fieldLineRe.test(block)) {
    if (value == null) return block;
    return block.replace(
      fieldLineRe,
      `\n${indent}${fieldName}: ${JSON.stringify(value)},`,
    );
  }

  if (value == null) return block;

  const insertLine = `${indent}${fieldName}: ${JSON.stringify(value)},\n`;
  const afterRe = new RegExp(
    `(\\n${indent}${afterField}: [^\\n]+,\\n)`,
    "m",
  );
  if (afterRe.test(block)) {
    return block.replace(afterRe, `$1${insertLine}`);
  }

  const nameRe = new RegExp(`(\\n${indent}name: "[^"]+",\\n)`);
  return block.replace(nameRe, `$1${insertLine}`);
}

function patchBlock(block, patch) {
  let out = block;

  const indent = blockIndent(out);

  if (patch.source !== undefined) {
    const sourceRe = new RegExp(`\\n${indent}source:.*`, "m");
    if (sourceRe.test(out)) {
      out = out.replace(
        sourceRe,
        `\n${indent}source: ${JSON.stringify(patch.source)},`,
      );
    } else {
      out = upsertField(out, "source", patch.source, { afterField: "notes" });
    }
  }

  if (patch.videoUrl !== undefined) {
    const videoRe = new RegExp(
      `\\n${indent}videoUrl:(?:\\s*undefined,?|\\s*"[^"]*",?|\\s*\\n\\s*"[^"]*",?)`,
      "m",
    );
    if (patch.videoUrl == null) {
      if (videoRe.test(out)) {
        out = out.replace(videoRe, `\n${indent}videoUrl: undefined,`);
      }
    } else if (videoRe.test(out)) {
      out = out.replace(
        videoRe,
        `\n${indent}videoUrl: ${JSON.stringify(patch.videoUrl)},`,
      );
    } else {
      out = upsertField(out, "videoUrl", patch.videoUrl, { afterField: "source" });
    }
  }

  if (patch.expertiseLevel !== undefined) {
    out = upsertField(out, "expertiseLevel", patch.expertiseLevel, {
      afterField: "equipment",
    });
  }

  return out;
}

export function applyPatchesToFile(filePath, patchesById) {
  let text = readFileSync(join(ROOT, filePath), "utf8").replace(/\r\n/g, "\n");
  const blockRe = blockRegexForFile(filePath);

  const { map } = indexBlocksById(text, blockRe);
  const jobs = [];

  for (const [id, patch] of patchesById) {
    const entry = map.get(id);
    if (!entry || !patch || Object.keys(patch).length === 0) continue;
    const newBlock = patchBlock(entry.block, patch);
    if (newBlock === entry.block) continue;
    jobs.push({ index: entry.index, length: entry.length, newBlock });
  }

  jobs.sort((a, b) => b.index - a.index);
  for (const job of jobs) {
    text =
      text.slice(0, job.index) +
      job.newBlock +
      text.slice(job.index + job.length);
  }

  if (jobs.length > 0) {
    writeFileSync(join(ROOT, filePath), text, "utf8");
  }
  return jobs.length;
}
