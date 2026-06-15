/**
 * Phase 0 - Exercise catalog audit (inventory only; no auto-fix).
 * Run: npm run audit:catalog
 * Optional: npm run audit:catalog -- --check-links  (HEAD requests; slow)
 *
 * Reads: src/core/catalog/data/exercises.ts, enduranceExercises.ts, hybridCalisthenicsExercises.ts
 * Writes: reports/catalog-audit.json, reports/catalog-audit.csv
 *
 * After changing exercise ids or categories in those files, also run:
 *   npm run generate:category-index
 * See docs/catalog-maintenance.md
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CATALOG_SOURCES,
  isCatalogAuditExempt,
  parseExercisesFromText,
} from "./lib/catalog-parse.mjs";
import {
  equipmentAuditMismatch,
  expectedEquipmentForExercise,
} from "./lib/equipment-heuristic.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORTS = join(ROOT, "reports");

const VALID_EQUIPMENT = new Set([
  "bodyweight",
  "rings",
  "resistance_band",
  "dumbbell",
  "kettlebell",
  "barbell",
  "machine",
  "cable",
  "medicine_ball",
  "plyo_box",
  "stability_ball",
  "pull_up_bar",
  "bicycle",
]);

const STRETCH_CATEGORIES = new Set(["SW", "SC"]);

function arraysEqualSorted(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function youtubeVideoKey(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/"))
        return u.pathname.split("/")[2] ?? null;
      return u.searchParams.get("v") ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function classifyVideoUrl(url) {
  if (!url) return "missing";
  const key = youtubeVideoKey(url);
  if (key) return "youtube";
  if (/\.(gif|webp|mp4|webm)(\?|$)/i.test(url)) return "direct-media";
  return "other";
}

function isVagueSource(label) {
  if (!label) return true;
  return /^video\s*\d+$/i.test(label.trim());
}

function buildIssues(entry) {
  if (isCatalogAuditExempt(entry)) {
    return { issues: [], flags: [] };
  }

  const issues = [];
  const flags = [];

  if (!entry.videoUrl) {
    issues.push("missing_video_url");
    flags.push("missing_video_url");
  }

  if (entry.equipment == null || entry.equipment.length === 0) {
    issues.push("missing_equipment");
    flags.push("missing_equipment");
  } else {
    for (const eq of entry.equipment) {
      if (!VALID_EQUIPMENT.has(eq)) {
        issues.push(`invalid_equipment:${eq}`);
        flags.push("invalid_equipment");
      }
    }
  }

  if (entry.name && entry.equipment?.length) {
    const expected = expectedEquipmentForExercise({
      name: entry.name,
      notes: entry.notes,
    });
    if (equipmentAuditMismatch(entry.equipment, expected)) {
      issues.push(
        `equipment_heuristic_mismatch:expected=${expected.join("|")}:actual=${entry.equipment.join("|")}`,
      );
      flags.push("equipment_heuristic_mismatch");
    }
  }

  const videoKind = classifyVideoUrl(entry.videoUrl);
  if (videoKind === "other") {
    issues.push("non_youtube_video_url");
    flags.push("non_youtube_video_url");
  }
  if (videoKind === "direct-media") {
    issues.push("direct_media_url");
    flags.push("direct_media_url");
  }

  if (isVagueSource(entry.sourceLabel)) {
    issues.push("vague_or_missing_source");
    flags.push("vague_or_missing_source");
  }

  if (!entry.expertiseLevel) {
    issues.push("missing_expertise_level");
    flags.push("missing_expertise_level");
  }

  return { issues, flags };
}

async function checkLink(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  const headers = [
    "id",
    "name",
    "category",
    "source_file",
    "flags",
    "videoUrl",
    "equipment",
    "source_label",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.name,
        r.category,
        r.source,
        r.flags.join(";"),
        r.videoUrl ?? "",
        (r.equipment ?? []).join("|"),
        r.sourceLabel ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

async function main() {
  const checkLinks = process.argv.includes("--check-links");
  const all = [];

  for (const { file, label } of CATALOG_SOURCES) {
    const text = readFileSync(join(ROOT, file), "utf8");
    const parsed = parseExercisesFromText(text, file);
    for (const e of parsed) {
      all.push({
        source: label,
        sourceFile: file,
        id: e.id,
        name: e.name,
        category: e.category,
        secondaryCategory: e.secondaryCategory,
        equipment: e.equipment,
        videoUrl: e.videoUrl,
        videoUrlExplicit: e.hasVideoField,
        sourceLabel: e.sourceLabel,
        expertiseLevel: e.expertiseLevel,
        notes: e.notes,
        isTimeBased: e.isTimeBased,
      });
    }
  }

  const idCounts = new Map();
  for (const e of all) {
    idCounts.set(e.id, (idCounts.get(e.id) ?? 0) + 1);
  }
  const duplicateIds = [...idCounts.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, count]) => ({ id, count }));

  const videoIdToExercises = new Map();
  const rows = [];

  for (const entry of all) {
    const { issues, flags } = buildIssues(entry);
    if (idCounts.get(entry.id) > 1) {
      issues.push("duplicate_id");
      flags.push("duplicate_id");
    }

    const yKey = youtubeVideoKey(entry.videoUrl);
    if (yKey) {
      const list = videoIdToExercises.get(yKey) ?? [];
      list.push(entry.id);
      videoIdToExercises.set(yKey, list);
    }

    let linkCheck = null;
    if (checkLinks && entry.videoUrl) {
      linkCheck = await checkLink(entry.videoUrl);
      if (!linkCheck.ok) {
        issues.push(`video_link_failed:${linkCheck.status}`);
        flags.push("video_link_failed");
      }
    }

    rows.push({
      ...entry,
      issues,
      flags,
      videoKind: classifyVideoUrl(entry.videoUrl),
      youtubeVideoId: yKey,
      linkCheck,
    });
  }

  const sharedYoutubeVideos = [...videoIdToExercises.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([youtubeVideoId, exerciseIds]) => ({
      youtubeVideoId,
      exerciseIds,
      count: exerciseIds.length,
    }))
    .sort((a, b) => b.count - a.count);

  const exemptCount = rows.filter((r) => isCatalogAuditExempt(r)).length;
  const flagged = rows.filter((r) => r.flags.length > 0);
  const byFlag = {};
  for (const r of flagged) {
    for (const f of r.flags) {
      byFlag[f] = (byFlag[f] ?? 0) + 1;
    }
  }

  const byCategory = {};
  for (const r of rows) {
    const c = r.category ?? "unknown";
    byCategory[c] = byCategory[c] ?? { total: 0, missing_video: 0 };
    byCategory[c].total += 1;
    if (!r.videoUrl) byCategory[c].missing_video += 1;
  }

  const stretchRows = rows.filter((r) => STRETCH_CATEGORIES.has(r.category));
  const stretchMissingVideo = stretchRows.filter((r) => !r.videoUrl).length;

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      exercises: rows.length,
      catalogAuditExempt: exemptCount,
      flagged: flagged.length,
      missingVideoUrl: rows.filter((r) => !r.videoUrl).length,
      missingEquipment: rows.filter((r) => !r.equipment?.length).length,
      nonYoutubeVideo: rows.filter((r) => r.videoKind === "other").length,
      vagueSource: rows.filter((r) =>
        r.flags.includes("vague_or_missing_source"),
      ).length,
      equipmentHeuristicMismatch: rows.filter((r) =>
        r.flags.includes("equipment_heuristic_mismatch"),
      ).length,
      duplicateIds: duplicateIds.length,
      sharedYoutubeVideos: sharedYoutubeVideos.length,
      stretchTotal: stretchRows.length,
      stretchMissingVideo,
    },
    flagCounts: byFlag,
    byCategory,
    duplicateIds,
    sharedYoutubeVideos: sharedYoutubeVideos.slice(0, 50),
    exercises: rows,
  };

  mkdirSync(REPORTS, { recursive: true });
  const jsonPath = join(REPORTS, "catalog-audit.json");
  const csvPath = join(REPORTS, "catalog-audit.csv");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(csvPath, toCsv(flagged));

  console.log("Exercise catalog audit (Phase 0)\n");
  console.log(`  Exercises parsed: ${rows.length}`);
  console.log(`  Audit-exempt:     ${exemptCount} (END-* cardio)`);
  console.log(`  Flagged rows:     ${flagged.length} (see CSV)`);
  console.log(`  Missing videoUrl: ${report.totals.missingVideoUrl}`);
  console.log(`  Missing equipment: ${report.totals.missingEquipment}`);
  console.log(`  Non-YouTube URL:  ${report.totals.nonYoutubeVideo}`);
  console.log(`  Vague/missing source: ${report.totals.vagueSource}`);
  console.log(
    `  Equipment heuristic mismatch: ${report.totals.equipmentHeuristicMismatch}`,
  );
  console.log(`  Duplicate IDs:    ${report.totals.duplicateIds}`);
  console.log(
    `  Shared YouTube IDs: ${report.totals.sharedYoutubeVideos} (same clip, many exercises - often OK)`,
  );
  console.log(
    `  Stretches (SW/SC) missing video: ${stretchMissingVideo} / ${stretchRows.length}`,
  );
  console.log("\n  Flag counts:");
  for (const [flag, count] of Object.entries(byFlag).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${flag}: ${count}`);
  }
  console.log(`\n  Wrote ${jsonPath}`);
  console.log(`  Wrote ${csvPath} (${flagged.length} flagged rows)`);
  if (!checkLinks) {
    console.log(
      "\n  Tip: run with --check-links to HEAD-check video URLs (slow).",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
