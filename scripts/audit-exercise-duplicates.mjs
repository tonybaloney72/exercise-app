/**
 * Audit exercise catalog for duplicate / near-duplicate names.
 * Run: node scripts/audit-exercise-duplicates.mjs
 */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { createRequire } from "module";

// Load compiled exercises via dynamic import of TS - use regex parse instead
const catalogText = readFileSync("src/data/exercises.ts", "utf8");
const hybridText = readFileSync(
  "src/data/hybridCalisthenicsExercises.ts",
  "utf8",
);

function parseExercises(text, source) {
  const entries = [];
  const blockRe = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  // Simpler: line-by-line id/name/category
  const idRe = /^\s*id:\s*"([^"]+)"/;
  const nameRe = /^\s*name:\s*"([^"]+)"/;
  const catRe = /^\s*category:\s*"([^"]+)"/;
  let cur = null;
  for (const line of text.split("\n")) {
    const idM = line.match(idRe);
    const nameM = line.match(nameRe);
    const catM = line.match(catRe);
    if (idM) {
      if (cur?.id && cur?.name) entries.push({ ...cur, source });
      cur = { id: idM[1], name: null, category: null };
    }
    if (cur && nameM) cur.name = nameM[1];
    if (cur && catM) cur.category = catM[1];
  }
  if (cur?.id && cur?.name) entries.push({ ...cur, source });
  return entries;
}

function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singularize(s) {
  const words = s.split(" ");
  return words
    .map((w) => {
      if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
      if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
      if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3)
        return w.slice(0, -1);
      return w;
    })
    .join(" ");
}

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const catalog = parseExercises(catalogText, "catalog");
const hybrid = parseExercises(hybridText, "hybrid");
const all = [...catalog, ...hybrid];

console.log(
  `Catalog: ${catalog.length}, Hybrid: ${hybrid.length}, Total parsed: ${all.length}\n`,
);

// Exact normalized dupes
const byNorm = new Map();
for (const e of all) {
  const n = norm(e.name);
  if (!byNorm.has(n)) byNorm.set(n, []);
  byNorm.get(n).push(e);
}
const exactDupes = [...byNorm.entries()].filter(([, v]) => v.length > 1);

// Singular-normalized dupes (twists vs twist)
const bySing = new Map();
for (const e of all) {
  const n = singularize(norm(e.name));
  if (!bySing.has(n)) bySing.set(n, []);
  bySing.get(n).push(e);
}
const singDupes = [...bySing.entries()].filter(([, v]) => {
  const norms = new Set(v.map((x) => norm(x.name)));
  return norms.size > 1 || v.length > 1;
});

// Near names (levenshtein)
const near = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i];
    const b = all[j];
    const na = norm(a.name);
    const nb = norm(b.name);
    if (na === nb) continue;
    const sa = singularize(na);
    const sb = singularize(nb);
    if (sa === sb) {
      near.push({ kind: "plural", a, b, na, nb });
      continue;
    }
    const d = lev(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    const ratio = d / maxLen;
    if ((maxLen >= 10 && d <= 3) || (maxLen >= 6 && d <= 2) || ratio <= 0.12) {
      near.push({ kind: "typo", a, b, d, na, nb });
    }
  }
}

console.log("=== EXACT same name (normalized) ===");
for (const [n, list] of exactDupes) {
  console.log(`  "${n}"`);
  for (const e of list) {
    console.log(`    - ${e.id} [${e.category}] (${e.source}) "${e.name}"`);
  }
}

console.log(
  "\n=== PLURAL / near-same (singularized match, different display name) ===",
);
const pluralSeen = new Set();
for (const { a, b, na, nb } of near.filter((x) => x.kind === "plural")) {
  const key = [a.id, b.id].sort().join("|");
  if (pluralSeen.has(key)) continue;
  pluralSeen.add(key);
  console.log(
    `  "${a.name}" (${a.id}, ${a.source}) <-> "${b.name}" (${b.id}, ${b.source})`,
  );
  console.log(`    cats: ${a.category} / ${b.category}`);
}

console.log("\n=== TYPO / high similarity ===");
const typoSeen = new Set();
for (const { a, b, d, na, nb } of near
  .filter((x) => x.kind === "typo")
  .sort((x, y) => x.d - y.d)) {
  const key = [a.id, b.id].sort().join("|");
  if (typoSeen.has(key)) continue;
  typoSeen.add(key);
  console.log(`  [dist ${d}] "${a.name}" (${a.id}) <-> "${b.name}" (${b.id})`);
  console.log(`    ${a.category}/${b.category} | ${a.source}/${b.source}`);
}

// Substring containment (one name contains other)
console.log(
  "\n=== SUBSTRING (likely variant, e.g. 'Push Up' vs 'Wide Push Up') ===",
);
const sub = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i];
    const b = all[j];
    const na = norm(a.name);
    const nb = norm(b.name);
    if (na.length < 4 || nb.length < 4) continue;
    if (na.includes(nb) || nb.includes(na)) {
      if (na === nb) continue;
      sub.push({ a, b, na, nb });
    }
  }
}
const subSeen = new Set();
for (const { a, b } of sub.slice(0, 80)) {
  const key = [a.id, b.id].sort().join("|");
  if (subSeen.has(key)) continue;
  subSeen.add(key);
  console.log(`  "${a.name}" (${a.id}) <-> "${b.name}" (${b.id})`);
}

console.log("\nCounts:", {
  exactDupes: exactDupes.length,
  pluralPairs: pluralSeen.size,
  typoPairs: typoSeen.size,
  substringPairs: subSeen.size,
});
