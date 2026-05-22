/**
 * Generate a local HTML page to review video suggestions (embeds + bulk actions).
 * Run: npm run catalog:video-review
 * Open: reports/video-review.html in a browser
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { ROOT } from "./lib/catalog-parse.mjs";
import { shouldAutoApprove } from "./lib/video-suggest.mjs";

const REPORTS = join(ROOT, "reports");
const IN_JSON = join(REPORTS, "video-suggestions.json");
const OUT_HTML = join(REPORTS, "video-review.html");

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  if (!existsSync(IN_JSON)) {
    console.error(`Missing ${IN_JSON} — run catalog:suggest-videos first.`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(IN_JSON, "utf8"));
  const rows = (data.rows ?? []).filter((r) => r.suggestedVideoUrl);

  const cards = rows
    .map((r) => {
      const id = r.youtubeVideoId || "";
      const auto = shouldAutoApprove(r);
      const status = (r.reviewStatus || "pending").toLowerCase();
      return `
      <article class="card" data-id="${escapeHtml(r.id)}" data-auto="${auto ? "1" : "0"}">
        <header>
          <h2>${escapeHtml(r.id)} — ${escapeHtml(r.name)}</h2>
          <p class="meta">${escapeHtml(r.category)} · ${escapeHtml(r.confidence)} · score ${escapeHtml(r.titleMatchScore)} · ${escapeHtml(r.strategy)}</p>
          <p class="meta">${escapeHtml(r.channelTitle)} — ${escapeHtml(r.videoTitle)}</p>
        </header>
        <iframe src="https://www.youtube.com/embed/${escapeHtml(id)}" loading="lazy" allowfullscreen></iframe>
        <div class="actions">
          <label><input type="radio" name="st-${escapeHtml(r.id)}" value="approved" ${status === "approved" ? "checked" : ""}${auto && status === "pending" ? " checked" : ""}> Approve</label>
          <label><input type="radio" name="st-${escapeHtml(r.id)}" value="pending" ${status === "pending" && !auto ? "checked" : ""}> Pending</label>
          <label><input type="radio" name="st-${escapeHtml(r.id)}" value="rejected" ${status === "rejected" ? "checked" : ""}> Reject</label>
        </div>
      </article>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Video suggestions review</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1rem 2rem; background: #111; color: #eee; }
    .toolbar { position: sticky; top: 0; background: #111; padding: 0.75rem 0; z-index: 2; border-bottom: 1px solid #333; }
    button { margin-right: 0.5rem; padding: 0.5rem 0.75rem; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 0.75rem; }
    .card h2 { font-size: 1rem; margin: 0 0 0.25rem; }
    .meta { font-size: 0.8rem; color: #aaa; margin: 0.15rem 0; }
    iframe { width: 100%; aspect-ratio: 16/9; border: 0; margin: 0.5rem 0; background: #000; }
    .actions label { margin-right: 0.75rem; font-size: 0.9rem; }
    #stats { color: #8cf; }
  </style>
</head>
<body>
  <div class="toolbar">
    <p id="stats"></p>
    <button type="button" id="approve-auto">Approve all auto-safe (${rows.filter(shouldAutoApprove).length})</button>
    <button type="button" id="approve-visible">Approve all shown</button>
    <button type="button" id="export-csv">Download CSV for apply</button>
  </div>
  <div class="grid">${cards}</div>
  <script>
    const cards = document.querySelectorAll(".card");
    function updateStats() {
      let a = 0, p = 0, r = 0;
      cards.forEach((card) => {
        const v = card.querySelector('input[value="approved"]:checked');
        if (v) a++; else if (card.querySelector('input[value="rejected"]:checked')) r++; else p++;
      });
      document.getElementById("stats").textContent = a + " approved · " + p + " pending · " + r + " rejected · " + cards.length + " with video";
    }
    cards.forEach((card) => card.querySelectorAll("input").forEach((i) => i.addEventListener("change", updateStats)));
    document.getElementById("approve-auto").onclick = () => {
      cards.forEach((card) => {
        if (card.dataset.auto === "1") card.querySelector('input[value="approved"]').checked = true;
      });
      updateStats();
    };
    document.getElementById("approve-visible").onclick = () => {
      cards.forEach((card) => card.querySelector('input[value="approved"]').checked = true);
      updateStats();
    };
    document.getElementById("export-csv").onclick = () => {
      const headers = ["id","reviewStatus","suggestedVideoUrl","finalVideoUrl"];
      const lines = [headers.join(",")];
      cards.forEach((card) => {
        const id = card.dataset.id;
        const st = card.querySelector('input:checked')?.value || "pending";
        const url = card.querySelector("iframe")?.src?.replace("/embed/","/watch?v=") || "";
        lines.push([id, st, url, ""].join(","));
      });
      const blob = new Blob([lines.join("\\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "video-review-export.csv";
      a.click();
    };
    updateStats();
  </script>
</body>
</html>`;

  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(OUT_HTML, html);
  console.log(`Wrote ${OUT_HTML} (${rows.length} embeds)`);
  console.log("Open in browser → approve → Download CSV →");
  console.log("  npm run catalog:suggest-videos -- --apply --from-csv=path/to/export.csv");
}

main();
