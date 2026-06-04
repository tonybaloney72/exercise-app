/**
 * Resolve display source labels from video/page URLs (YouTube oEmbed + hostnames).
 */

const oembedCache = new Map();

export function youtubeVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0]?.split("?")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

const HOST_LABELS = {
  "www.drfitology.com": "Dr. Fitology",
  "drfitology.com": "Dr. Fitology",
  "exrx.net": "ExRx.net",
  "www.exrx.net": "ExRx.net",
  "www.hybridcalisthenics.com": "Hybrid Calisthenics",
  "hybridcalisthenics.com": "Hybrid Calisthenics",
};

export function sourceLabelFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const full = new URL(url).hostname;
    return HOST_LABELS[full] ?? HOST_LABELS[host] ?? titleCaseSite(host);
  } catch {
    return null;
  }
}

function titleCaseSite(host) {
  const base = host.replace(/^www\./, "").split(".")[0] ?? host;
  return base
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isVagueSource(label) {
  if (!label) return true;
  return /^video\s*\d+$/i.test(label.trim());
}

async function resolveYoutubeChannelName(videoUrl, { fetchFn = fetch } = {}) {
  const id = youtubeVideoId(videoUrl);
  if (!id) return null;
  if (oembedCache.has(id)) return oembedCache.get(id);

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetchFn(oembedUrl, {
      headers: { "User-Agent": "exercise-app-catalog-enrich/1.0" },
    });
    if (!res.ok) {
      oembedCache.set(id, null);
      return null;
    }
    const data = await res.json();
    const name = data.author_name ?? null;
    oembedCache.set(id, name);
    await sleep(120);
    return name;
  } catch {
    oembedCache.set(id, null);
    return null;
  }
}

export async function resolveSourceForVideoUrl(videoUrl, options = {}) {
  const yt = youtubeVideoId(videoUrl);
  if (yt) {
    const channel = await resolveYoutubeChannelName(videoUrl, options);
    return channel ?? "YouTube";
  }
  return sourceLabelFromUrl(videoUrl);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function exportOembedCache() {
  return Object.fromEntries(oembedCache);
}

export function loadOembedCache(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) oembedCache.set(k, v);
}
