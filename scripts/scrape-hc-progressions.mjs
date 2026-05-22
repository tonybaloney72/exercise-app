/**
 * Scrape Hybrid Calisthenics progression pages for exercise names, video URL, and rank.
 * Run: node scripts/scrape-hc-progressions.mjs
 * Writes: reports/hc-progressions.json
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { normalizeExerciseName } from "./lib/catalog-parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "reports/hc-progressions.json");

const PAGES = [
  { path: "/pushups", slug: "pushups" },
  { path: "/pullups", slug: "pullups" },
  { path: "/squats", slug: "squats" },
  { path: "/legraises", slug: "legraises" },
  { path: "/bridges", slug: "bridges" },
  { path: "/twists", slug: "twists" },
];

const BASE = "https://www.hybridcalisthenics.com";

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractYoutubeUrl(html) {
  const m =
    html.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i) ??
    html.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i) ??
    html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : null;
}

function parseProgressionPage(html, pageMeta) {
  const videoUrl = extractYoutubeUrl(html);
  const steps = [];
  const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let m;
  while ((m = h3Re.exec(html)) !== null) {
    const raw = decodeHtml(m[1]);
    const stepM = raw.match(/^#\d+\s*[-–—]?\s*(.+)$/i);
    if (!stepM) continue;
    const name = stepM[1].trim();
    if (/^faq$/i.test(name)) continue;
    steps.push({ name, normalized: normalizeExerciseName(name) });
  }

  const total = steps.length;
  return steps.map((step, i) => ({
    name: step.name,
    normalized: step.normalized,
    progressionIndex: i + 1,
    progressionTotal: total,
    videoUrl,
    page: pageMeta.slug,
    source: "Hybrid Calisthenics",
  }));
}

async function main() {
  const byNormalized = new Map();
  const pages = [];

  for (const page of PAGES) {
    const url = `${BASE}${page.path}`;
    console.log(`Fetching ${url}…`);
    const res = await fetch(url, {
      headers: { "User-Agent": "exercise-app-catalog-enrich/1.0" },
    });
    if (!res.ok) {
      console.warn(`  skip ${page.path}: HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const steps = parseProgressionPage(html, page);
    pages.push({ ...page, url, stepCount: steps.length, videoUrl: steps[0]?.videoUrl ?? null });
    for (const step of steps) {
      if (!byNormalized.has(step.normalized)) {
        byNormalized.set(step.normalized, step);
      }
    }
    await sleep(400);
  }

  const payload = {
    scrapedAt: new Date().toISOString(),
    pages,
    byNormalized: Object.fromEntries(byNormalized),
  };

  mkdirSync(join(ROOT, "reports"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${byNormalized.size} progression entries to ${OUT}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
