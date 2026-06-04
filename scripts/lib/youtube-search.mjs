/**
 * YouTube search + verify helpers for catalog video suggestions.
 * Prefer YOUTUBE_API_KEY (Data API v3); falls back to parsing search HTML.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { youtubeVideoId } from "./source-resolve.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const YOUTUBE_SEARCH_CACHE_PATH = join(
  __dirname,
  "../../reports/youtube-search-cache.json",
);

const DEFAULT_UA =
  "Mozilla/5.0 (compatible; exercise-app-catalog/1.0; +https://github.com/)";

let searchCache = {};

export function loadYoutubeSearchCache(path = YOUTUBE_SEARCH_CACHE_PATH) {
  try {
    if (existsSync(path)) {
      searchCache = JSON.parse(readFileSync(path, "utf8"));
    }
  } catch {
    searchCache = {};
  }
  return searchCache;
}

export function saveYoutubeSearchCache(path = YOUTUBE_SEARCH_CACHE_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(searchCache, null, 2));
}

function watchUrlFromVideoId(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/**
 * @param {string} query
 * @param {{ apiKey?: string, maxResults?: number, fetchFn?: typeof fetch }} options
 * @returns {Promise<Array<{ videoId: string, title: string, channelTitle: string, url: string }>>}
 */
export async function searchYoutube(query, options = {}) {
  const q = query.trim();
  if (!q) return [];

  if (searchCache[q]) {
    return searchCache[q].results;
  }

  const { apiKey = process.env.YOUTUBE_API_KEY, maxResults = 5, fetchFn = fetch } =
    options;

  const forceHtml = options.forceHtml === true;
  let via = "html";
  let results = [];

  if (apiKey && !forceHtml) {
    try {
      results = await searchViaDataApi(q, { apiKey, maxResults, fetchFn });
      via = "data-api";
    } catch (err) {
      const msg = String(err);
      if (/403/.test(msg) && /quota/i.test(msg)) {
        console.warn(`YouTube API quota hit for "${q}" — using HTML search.`);
        results = await searchViaHtml(q, { maxResults, fetchFn });
        via = "html-quota-fallback";
      } else {
        throw err;
      }
    }
  } else {
    results = await searchViaHtml(q, { maxResults, fetchFn });
  }

  searchCache[q] = {
    fetchedAt: new Date().toISOString(),
    via,
    results,
  };

  return results;
}

async function searchViaDataApi(query, { apiKey, maxResults, fetchFn }) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("safeSearch", "moderate");

  const res = await fetchFn(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube Data API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.items ?? [])
    .map((item) => {
      const videoId = item.id?.videoId;
      if (!videoId) return null;
      return {
        videoId,
        title: item.snippet?.title ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        url: watchUrlFromVideoId(videoId),
      };
    })
    .filter(Boolean);
}

async function searchViaHtml(query, { maxResults, fetchFn }) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const res = await fetchFn(url, {
    headers: { "User-Agent": DEFAULT_UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) {
    throw new Error(`YouTube search HTML ${res.status}`);
  }

  const html = await res.text();
  const ids = [];
  const seen = new Set();
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    ids.push(m[1]);
    if (ids.length >= maxResults + 3) break;
  }

  return ids.slice(0, maxResults).map((videoId) => ({
    videoId,
    title: "",
    channelTitle: "",
    url: watchUrlFromVideoId(videoId),
  }));
}

/** oEmbed confirms the clip is embeddable and returns title/channel. */
export async function verifyYoutubeVideo(url, { fetchFn = fetch } = {}) {
  const id = youtubeVideoId(url);
  if (!id) return { ok: false, reason: "not_youtube" };

  const watchUrl = watchUrlFromVideoId(id);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetchFn(oembedUrl);
    if (!res.ok) {
      return { ok: false, reason: `oembed_${res.status}`, videoId: id };
    }
    const data = await res.json();
    return {
      ok: true,
      videoId: id,
      url: watchUrl,
      title: data.title ?? "",
      channelTitle: data.author_name ?? "",
    };
  } catch (err) {
    return { ok: false, reason: String(err), videoId: id };
  }
}
