/**
 * Automated catalog enrichment: sources, expertiseLevel, HC progression videos.
 *
 * Run: npm run catalog:enrich
 * Options:
 *   --dry-run          Report only; do not write TS files
 *   --skip-scrape      Use existing reports/hc-progressions.json
 *   --skip-oembed      Do not call YouTube oEmbed (keep hostname / HC labels only)
 *
 * Writes: reports/catalog-enrichment-summary.json
 * Patches: src/core/catalog/data/exercises.ts, hybridCalisthenicsExercises.ts, enduranceExercises.ts
 *
 * After a run that changes ids or categories, also run:
 *   npm run generate:category-index
 * See docs/catalog-maintenance.md
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import {
  CATALOG_SOURCES,
  ROOT,
  applyPatchesToFile,
  loadAllExercises,
  lookupHcProgression,
  isCatalogAuditExempt,
} from "./lib/catalog-parse.mjs";
import { inferExpertiseLevel } from "./lib/expertise-infer.mjs";
import {
  isVagueSource,
  loadOembedCache,
  resolveSourceForVideoUrl,
  sourceLabelFromUrl,
  youtubeVideoId,
  exportOembedCache,
} from "./lib/source-resolve.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS = join(ROOT, "reports");
const HC_CACHE = join(REPORTS, "hc-progressions.json");
const OEMBED_CACHE = join(REPORTS, "youtube-oembed-cache.json");
const SUMMARY_OUT = join(REPORTS, "catalog-enrichment-summary.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipScrape = args.has("--skip-scrape");
const skipOembed = args.has("--skip-oembed");

function loadHcProgressions() {
  try {
    const raw = readFileSync(HC_CACHE, "utf8");
    const data = JSON.parse(raw);
    return data.byNormalized ?? {};
  } catch {
    return {};
  }
}

function runHcScrape() {
  const script = join(__dirname, "scrape-hc-progressions.mjs");
  const r = spawnSync(process.execPath, [script], {
    stdio: "inherit",
    cwd: ROOT,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function main() {
  mkdirSync(REPORTS, { recursive: true });

  if (!skipScrape) {
    runHcScrape();
  }

  const hcByName = loadHcProgressions();
  if (Object.keys(hcByName).length === 0) {
    console.warn("No HC progression cache; run without --skip-scrape first.");
  }

  try {
    loadOembedCache(JSON.parse(readFileSync(OEMBED_CACHE, "utf8")));
  } catch {
    /* no cache */
  }

  const exercises = loadAllExercises();
  const patchesByFile = new Map();
  for (const { file } of CATALOG_SOURCES) {
    patchesByFile.set(file, new Map());
  }

  const uniqueYoutubeUrls = new Set();
  for (const ex of exercises) {
    if (ex.videoUrl && youtubeVideoId(ex.videoUrl))
      uniqueYoutubeUrls.add(ex.videoUrl);
  }
  const channelByVideoId = new Map();
  if (!skipOembed) {
    console.log(`Resolving ${uniqueYoutubeUrls.size} unique YouTube URLs…`);
    for (const url of uniqueYoutubeUrls) {
      const id = youtubeVideoId(url);
      const channel = await resolveSourceForVideoUrl(url);
      if (id) channelByVideoId.set(id, channel);
    }
    writeFileSync(OEMBED_CACHE, JSON.stringify(exportOembedCache(), null, 2));
  }

  const stats = {
    total: exercises.length,
    sourceUpdated: 0,
    videoAdded: 0,
    expertiseAdded: 0,
    hcMatched: 0,
    skippedEndurance: 0,
  };

  const enrichmentRows = [];

  for (const ex of exercises) {
    const patch = {};
    const hc = lookupHcProgression(hcByName, ex.name ?? "");
    const row = {
      id: ex.id,
      name: ex.name,
      file: ex.sourceFile,
      patch: {},
    };

    if (isCatalogAuditExempt(ex)) {
      stats.skippedEndurance += 1;
      enrichmentRows.push(row);
      continue;
    }

    let videoUrl = ex.videoUrl;
    if (!videoUrl && hc?.videoUrl) {
      videoUrl = hc.videoUrl;
      patch.videoUrl = videoUrl;
      stats.videoAdded += 1;
      stats.hcMatched += 1;
    }

    const progression =
      hc != null
        ? {
            progressionIndex: hc.progressionIndex,
            progressionTotal: hc.progressionTotal,
          }
        : {};

    const expertise = inferExpertiseLevel(
      { ...ex, videoUrl: videoUrl ?? ex.videoUrl },
      progression,
    );
    if (!ex.expertiseLevel || ex.expertiseLevel !== expertise) {
      patch.expertiseLevel = expertise;
      stats.expertiseAdded += 1;
    }

    const effectiveUrl = patch.videoUrl ?? ex.videoUrl;
    let source = ex.sourceLabel;

    if (effectiveUrl) {
      const ytId = youtubeVideoId(effectiveUrl);
      if (ytId && channelByVideoId.has(ytId)) {
        source = channelByVideoId.get(ytId) ?? source;
      } else if (isVagueSource(source) || !source) {
        source =
          sourceLabelFromUrl(effectiveUrl) ??
          hc?.source ??
          (ex.sourceFile.includes("hybrid") ? "Hybrid Calisthenics" : null);
      }
      if (source && source !== ex.sourceLabel) {
        patch.source = source;
        stats.sourceUpdated += 1;
      }
    } else if (!source && ex.sourceFile.includes("hybrid")) {
      patch.source = "Hybrid Calisthenics";
      stats.sourceUpdated += 1;
    }

    if (Object.keys(patch).length > 0) {
      patchesByFile.get(ex.sourceFile).set(ex.id, patch);
      row.patch = patch;
    }
    enrichmentRows.push(row);
  }

  const appliedByFile = {};
  if (!dryRun) {
    for (const [file, patches] of patchesByFile) {
      if (patches.size === 0) continue;
      appliedByFile[file] = applyPatchesToFile(file, patches);
      console.log(`Patched ${appliedByFile[file]} blocks in ${file}`);
    }
  } else {
    console.log("Dry run - no files written.");
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    dryRun,
    skipScrape,
    skipOembed,
    stats,
    appliedByFile,
    samplePatches: enrichmentRows
      .filter((r) => Object.keys(r.patch).length > 0)
      .slice(0, 30),
  };

  writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2));

  writeFileSync(
    join(REPORTS, "catalog-enrichment.csv"),
    enrichmentCsv(enrichmentRows),
  );

  console.log("\nCatalog enrichment summary:");
  console.log(`  Source labels updated: ${stats.sourceUpdated}`);
  console.log(
    `  Videos added (HC match): ${stats.videoAdded} (${stats.hcMatched} name matches)`,
  );
  console.log(`  Expertise levels set:  ${stats.expertiseAdded}`);
  console.log(`  Summary: ${SUMMARY_OUT}`);
  console.log("\nRe-run: npm run audit:catalog");
}

function enrichmentCsv(rows) {
  const headers = [
    "id",
    "name",
    "file",
    "patch_source",
    "patch_videoUrl",
    "patch_expertiseLevel",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.name,
        r.file,
        r.patch.source ?? "",
        r.patch.videoUrl ?? "",
        r.patch.expertiseLevel ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
