/**
 * Suggest YouTube URLs for catalog exercises missing videoUrl.
 *
 * Run: npm run catalog:suggest-videos
 * Requires: YOUTUBE_API_KEY recommended (else HTML search fallback — may break)
 *
 * Options:
 *   --dry-run              Default; write CSV/JSON only
 *   --apply                Patch TS from suggestions (see --approve)
 *   --approve=high|medium|all   Apply rows at/above confidence (with --apply)
 *   --from-csv=path        Apply from CSV (merges metadata from video-suggestions.json)
 *   --from-json[=path]     Apply from JSON rows (use after editing video-suggestions.json)
 *   --sync-csv             Rewrite video-suggestions.csv from JSON (no YouTube calls)
 *   --limit=N              Process first N missing only
 *   --ids=CF-13,HC-001     Comma-separated ids
 *   --delay-ms=1200        Pause between YouTube searches (default 1200)
 *   --skip-search          Only duplicate-name matches
 *   --resume               Keep prior rows; only search ids still without a suggestion
 *   --html                 Never use Data API (no quota; HTML search only)
 *   --auto-mark            Set reviewStatus=approved on auto-safe rows (see shouldAutoApprove)
 *   --mark-approved        Update JSON/CSV only: auto-mark + save (no YouTube calls)
 *
 * Writes: reports/video-suggestions.csv, video-suggestions.json
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  applyPatchesToFile,
  isCatalogAuditExempt,
  loadAllExercises,
  ROOT,
} from "./lib/catalog-parse.mjs";
import { loadEnvFiles } from "./lib/load-env.mjs";
import {
  loadYoutubeSearchCache,
  saveYoutubeSearchCache,
} from "./lib/youtube-search.mjs";
import {
  suggestVideoForExercise,
  shouldAutoApprove,
} from "./lib/video-suggest.mjs";
import {
  resolveSourceForVideoUrl,
  exportOembedCache,
  loadOembedCache,
} from "./lib/source-resolve.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS = join(ROOT, "reports");
const OUT_JSON = join(REPORTS, "video-suggestions.json");
const OUT_CSV = join(REPORTS, "video-suggestions.csv");
const OEMBED_CACHE = join(REPORTS, "youtube-oembed-cache.json");

function parseArgs(argv) {
  const opts = {
    dryRun: true,
    apply: false,
    approve: null,
    fromCsv: null,
    fromJson: null,
    syncCsv: false,
    limit: null,
    ids: null,
    delayMs: 1200,
    skipSearch: false,
    resume: false,
    forceHtml: false,
    autoMark: false,
    markApprovedOnly: false,
  };
  for (const arg of argv) {
    if (arg === "--apply") opts.dryRun = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--approve=")) opts.approve = arg.slice("--approve=".length);
    else if (arg.startsWith("--from-csv=")) opts.fromCsv = arg.slice("--from-csv=".length);
    else if (arg === "--from-json") opts.fromJson = OUT_JSON;
    else if (arg.startsWith("--from-json=")) {
      opts.fromJson = arg.slice("--from-json=".length);
    } else if (arg === "--sync-csv") opts.syncCsv = true;
    else if (arg.startsWith("--limit=")) opts.limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--ids=")) opts.ids = arg.slice("--ids=".length).split(",");
    else if (arg.startsWith("--delay-ms=")) opts.delayMs = Number(arg.slice("--delay-ms=".length));
    else if (arg === "--skip-search") opts.skipSearch = true;
    else if (arg === "--resume") opts.resume = true;
    else if (arg === "--html") opts.forceHtml = true;
    else if (arg === "--auto-mark") opts.autoMark = true;
    else if (arg === "--mark-approved") opts.markApprovedOnly = true;
  }
  if (opts.apply && !opts.approve && !opts.fromCsv && !opts.fromJson) {
    opts.approve = "high";
  }
  return opts;
}

function loadRowsFromJson(path = OUT_JSON) {
  const jsonPath = path.startsWith("/") || /^[A-Za-z]:/.test(path) ? path : join(ROOT, path);
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  return data.rows ?? [];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CONF_RANK = { none: 0, low: 1, medium: 2, high: 3 };

function meetsApprove(confidence, approve) {
  if (approve === "all") return confidence !== "none";
  const need = CONF_RANK[approve] ?? CONF_RANK.high;
  return (CONF_RANK[confidence] ?? 0) >= need;
}

function loadPreviousRows() {
  const previous = {};
  if (!existsSync(OUT_JSON)) return previous;
  try {
    const raw = JSON.parse(readFileSync(OUT_JSON, "utf8"));
    for (const row of raw.rows ?? []) {
      previous[row.id] = row;
    }
  } catch {
    /* ignore */
  }
  return previous;
}

function rowFromSuggestion(ex, suggestion, previousRow) {
  const row = {
    id: ex.id,
    name: ex.name,
    category: ex.category,
    sourceFile: ex.sourceFile,
    sourceLabel: ex.sourceLabel ?? "",
    searchQuery: suggestion.searchQuery ?? "",
    suggestedVideoUrl: suggestion.suggestedVideoUrl ?? "",
    youtubeVideoId: suggestion.youtubeVideoId ?? "",
    videoTitle: suggestion.videoTitle ?? "",
    channelTitle: suggestion.channelTitle ?? "",
    strategy: suggestion.strategy,
    confidence: suggestion.confidence,
    verified: suggestion.verified ? "yes" : "no",
    titleMatchScore:
      suggestion.titleMatchScore != null
        ? String(suggestion.titleMatchScore.toFixed(2))
        : "",
    duplicateOfId: suggestion.duplicateOfId ?? "",
    reviewStatus: previousRow?.reviewStatus ?? "pending",
    finalVideoUrl: previousRow?.finalVideoUrl ?? "",
    error: suggestion.error ?? "",
  };
  return row;
}

function applyAutoMarkToRow(row, autoMark) {
  if (!autoMark) return row;
  if (shouldAutoApprove(row) && (row.reviewStatus || "pending") === "pending") {
    return { ...row, reviewStatus: "approved" };
  }
  return row;
}

function mergeRows(previous, newRows) {
  const map = { ...previous };
  for (const row of newRows) {
    map[row.id] = row;
  }
  return Object.values(map).sort((a, b) => a.id.localeCompare(b.id));
}

async function buildSuggestions(exercises, opts) {
  const missing = exercises.filter(
    (ex) => !isCatalogAuditExempt(ex) && !ex.videoUrl,
  );

  const previous = loadPreviousRows();

  let targets = missing;
  if (opts.ids?.length) {
    const set = new Set(opts.ids);
    targets = missing.filter((ex) => set.has(ex.id));
  }

  if (opts.resume) {
    targets = targets.filter((ex) => !previous[ex.id]?.suggestedVideoUrl);
  }

  if (opts.limit != null && opts.limit > 0) {
    targets = targets.slice(0, opts.limit);
  }

  const apiKey = opts.forceHtml ? null : process.env.YOUTUBE_API_KEY;
  if (!apiKey && !opts.skipSearch && !opts.forceHtml) {
    console.warn(
      "YOUTUBE_API_KEY not set — using HTML search fallback (less reliable).",
    );
  }
  if (opts.forceHtml) {
    console.log("Using HTML search only (--html, no Data API quota).");
  }

  loadYoutubeSearchCache();
  try {
    loadOembedCache(JSON.parse(readFileSync(OEMBED_CACHE, "utf8")));
  } catch {
    /* no cache */
  }

  const newRows = [];
  let i = 0;
  for (const ex of targets) {
    i += 1;
    process.stdout.write(`[${i}/${targets.length}] ${ex.id} ${ex.name}… `);

    const suggestion = await suggestVideoForExercise(ex, exercises, {
      apiKey: apiKey ?? undefined,
      forceHtml: opts.forceHtml,
      skipSearch: opts.skipSearch,
    });

    let row = rowFromSuggestion(ex, suggestion, previous[ex.id]);
    row = applyAutoMarkToRow(row, opts.autoMark);
    newRows.push(row);
    console.log(
      suggestion.suggestedVideoUrl
        ? `${suggestion.confidence} ${suggestion.strategy}${row.reviewStatus === "approved" ? " [auto-approved]" : ""}`
        : `no match (${suggestion.strategy})`,
    );

    if (!opts.skipSearch && suggestion.strategy === "youtube_search") {
      await sleep(opts.delayMs);
    }
  }

  saveYoutubeSearchCache();
  writeFileSync(OEMBED_CACHE, JSON.stringify(exportOembedCache(), null, 2));

  const rows = mergeRows(previous, newRows);
  if (opts.autoMark) {
    for (let j = 0; j < rows.length; j++) {
      rows[j] = applyAutoMarkToRow(rows[j], true);
    }
  }

  return {
    targets: targets.length,
    rows,
    missingTotal: missing.length,
    skippedResume: Object.keys(previous).filter((id) => previous[id]?.suggestedVideoUrl)
      .length,
  };
}

function markApprovedOnly() {
  const previous = loadPreviousRows();
  const rows = Object.values(previous).map((r) => applyAutoMarkToRow(r, true));
  const marked = rows.filter((r) => r.reviewStatus === "approved").length;
  writeOutput({ rows, missingTotal: rows.length, processed: 0, apiKeyPresent: false });
  console.log(`Auto-marked ${marked} / ${rows.length} rows as approved.`);
  return rows;
}

function writeOutput({ rows, missingTotal, processed, apiKeyPresent, skippedResume = 0 }) {
  const payload = {
    generatedAt: new Date().toISOString(),
    missingTotal,
    processed,
    skippedResume,
    apiKeyPresent,
    rows,
  };
  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));
  writeFileSync(OUT_CSV, rowsToCsv(rows));
}

function rowsToCsv(rows) {
  const headers = [
    "id",
    "name",
    "category",
    "sourceFile",
    "sourceLabel",
    "searchQuery",
    "suggestedVideoUrl",
    "youtubeVideoId",
    "videoTitle",
    "channelTitle",
    "strategy",
    "confidence",
    "verified",
    "titleMatchScore",
    "duplicateOfId",
    "reviewStatus",
    "finalVideoUrl",
    "error",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\n");
}

function parseCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? "";
    });
    return row;
  });
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

async function applySuggestions(rows, opts) {
  const fullById = loadPreviousRows();
  const patchesByFile = new Map();

  for (const row of rows) {
    const full = { ...fullById[row.id], ...row };
    let url = (full.finalVideoUrl || "").trim();
    if (!url) url = (full.suggestedVideoUrl || "").trim();

    const status = (full.reviewStatus || "").toLowerCase();
    if (opts.fromCsv || opts.fromJson) {
      if (status === "rejected" || status === "skip") continue;
      if (!url && status !== "approved") continue;
      if (status === "approved" && !url) continue;
    } else if (opts.approve) {
      if (!meetsApprove(row.confidence, opts.approve)) continue;
      if (!url) continue;
    } else {
      continue;
    }

    const file = full.sourceFile;
    if (!file) continue;
    if (!patchesByFile.has(file)) patchesByFile.set(file, new Map());

    const source =
      (await resolveSourceForVideoUrl(url)) ||
      full.channelTitle ||
      full.sourceLabel;

    patchesByFile.get(file).set(full.id, {
      videoUrl: url,
      ...(source ? { source } : {}),
    });
  }

  const applied = {};
  for (const [file, patches] of patchesByFile) {
    if (patches.size === 0) continue;
    applied[file] = applyPatchesToFile(file, patches);
    console.log(`Patched ${applied[file]} blocks in ${file}`);
  }
  return applied;
}

async function main() {
  loadEnvFiles();
  const opts = parseArgs(process.argv.slice(2));
  mkdirSync(REPORTS, { recursive: true });

  if (opts.syncCsv) {
    const rows = loadRowsFromJson(OUT_JSON);
    writeFileSync(OUT_CSV, rowsToCsv(rows));
    console.log(`Wrote ${OUT_CSV} from JSON (${rows.length} rows).`);
    return;
  }

  if (opts.markApprovedOnly) {
    markApprovedOnly();
    console.log("\nApply approved rows:");
    console.log(
      "  npm run catalog:suggest-videos -- --apply --from-json",
    );
    return;
  }

  if (opts.fromCsv || opts.fromJson) {
    const rows = opts.fromJson
      ? loadRowsFromJson(opts.fromJson)
      : parseCsv(readFileSync(join(ROOT, opts.fromCsv), "utf8"));
    const label = opts.fromJson ?? opts.fromCsv;
    if (opts.dryRun) {
      const would = rows.filter((r) => {
        const url = (r.finalVideoUrl || r.suggestedVideoUrl || "").trim();
        const status = (r.reviewStatus || "").toLowerCase();
        if (opts.fromJson || opts.fromCsv) {
          return url && status === "approved";
        }
        return url && (status === "approved" || opts.approve);
      });
      console.log(`Dry run: would apply ${would.length} rows from ${label}`);
      return;
    }
    await applySuggestions(rows, { ...opts, fromJson: Boolean(opts.fromJson) });
    console.log("\nRe-run: npm run audit:catalog");
    return;
  }

  const exercises = loadAllExercises();
  const { rows, targets, missingTotal, skippedResume } = await buildSuggestions(
    exercises,
    opts,
  );

  writeOutput({
    rows,
    missingTotal,
    processed: targets,
    skippedResume,
    apiKeyPresent: Boolean(process.env.YOUTUBE_API_KEY) && !opts.forceHtml,
  });

  const withUrl = rows.filter((r) => r.suggestedVideoUrl);
  const byConf = {};
  for (const r of withUrl) {
    byConf[r.confidence] = (byConf[r.confidence] ?? 0) + 1;
  }

  console.log("\nVideo suggestions:");
  console.log(`  Missing in catalog: ${missingTotal}`);
  console.log(`  Processed:          ${targets}`);
  if (skippedResume) console.log(`  Kept prior rows:    ${skippedResume}`);
  console.log(`  With suggestion:    ${withUrl.length}`);
  const approved = rows.filter((r) => r.reviewStatus === "approved");
  if (approved.length) console.log(`  Approved (mark):    ${approved.length}`);
  console.log(`  By confidence:      ${JSON.stringify(byConf)}`);
  console.log(`  CSV: ${OUT_CSV}`);
  console.log(`  JSON: ${OUT_JSON}`);
  console.log(
    "\nReview CSV: set reviewStatus=approved and/or finalVideoUrl, then:",
  );
  console.log(
    "  npm run catalog:suggest-videos -- --apply --from-csv=reports/video-suggestions.csv",
  );
  console.log("Bulk review UI:");
  console.log("  npm run catalog:video-review");
  console.log("Auto-mark safe rows then apply:");
  console.log("  npm run catalog:suggest-videos -- --mark-approved");
  console.log("  npm run catalog:suggest-videos -- --apply --from-csv=reports/video-suggestions.csv");
  console.log("Continue after quota (HTML search, keeps your 52):");
  console.log("  npm run catalog:suggest-videos -- --resume --html");

  if (opts.apply) {
    await applySuggestions(rows, opts);
    console.log("\nRe-run: npm run audit:catalog");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
