/**
 * Build search queries and pick best YouTube candidate for an exercise.
 */

import { normalizeExerciseName } from "./catalog-parse.mjs";
import { searchYoutube, verifyYoutubeVideo } from "./youtube-search.mjs";

/** YouTube search uses exercise name only (catalog source is ignored). */
export function buildYoutubeSearchQuery(ex) {
  return (ex.name ?? "").trim().replace(/\s+/g, " ");
}

function tokenSet(s) {
  return new Set(
    normalizeExerciseName(s)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

/** 0–1 overlap between exercise name and video title. */
export function titleMatchScore(exerciseName, videoTitle) {
  const a = tokenSet(exerciseName);
  const b = tokenSet(videoTitle);
  if (a.size === 0 || b.size === 0) return 0;
  let hit = 0;
  for (const t of a) {
    if (b.has(t)) hit += 1;
  }
  return hit / a.size;
}

const DEMO_TITLE_RE =
  /\b(how\s+to|tutorial|form|technique|proper|correct|demo|instruction|step\s+by\s+step|guide)\b/i;
const OVERVIEW_TITLE_RE =
  /\b(progressions?|science|philosophy|journey|story|podcast|interview|vlog|week\s+\d+|why\s+you)\b/i;

/**
 * Rank verified search hits: name overlap first, then demo-style titles.
 */
export function rankVideoCandidate(exerciseName, videoTitle, channelTitle = "") {
  const nameScore = titleMatchScore(exerciseName, videoTitle);
  let bonus = 0;
  if (DEMO_TITLE_RE.test(videoTitle)) bonus += 0.15;
  if (OVERVIEW_TITLE_RE.test(videoTitle)) bonus -= 0.2;
  if (/hybrid\s*calisthenics/i.test(channelTitle) && !DEMO_TITLE_RE.test(videoTitle)) {
    bonus -= 0.1;
  }
  return Math.max(0, Math.min(1, nameScore + bonus));
}

/**
 * Find an existing catalog row with same normalized name and a YouTube URL.
 * @param {Array<{ id: string, name: string, videoUrl?: string | null }>} all
 * @param {{ id: string, name: string }} target
 */
export function findDuplicateNameVideo(all, target) {
  const norm = normalizeExerciseName(target.name);
  for (const ex of all) {
    if (ex.id === target.id) continue;
    if (!ex.videoUrl || !/youtube/i.test(ex.videoUrl)) continue;
    if (normalizeExerciseName(ex.name) === norm) {
      return ex;
    }
  }
  return null;
}

/**
 * @param {{ id: string, name: string, sourceLabel?: string | null, category?: string | null, equipment?: string[] | null }} ex
 * @param {Array<{ id: string, name: string, videoUrl?: string | null }>} allExercises
 * @param {{ apiKey?: string, fetchFn?: typeof fetch, skipSearch?: boolean }} options
 */
export async function suggestVideoForExercise(ex, allExercises, options = {}) {
  const dup = findDuplicateNameVideo(allExercises, ex);
  if (dup) {
    const verified = await verifyYoutubeVideo(dup.videoUrl, options);
    if (verified.ok) {
      return {
        suggestedVideoUrl: verified.url,
        youtubeVideoId: verified.videoId,
        videoTitle: verified.title,
        channelTitle: verified.channelTitle,
        searchQuery: buildYoutubeSearchQuery(ex),
        strategy: "duplicate_name",
        confidence: "high",
        verified: true,
        duplicateOfId: dup.id,
      };
    }
  }

  if (options.skipSearch) {
    return emptySuggestion(ex, "no_search");
  }

  const searchQuery = buildYoutubeSearchQuery(ex);
  let results;
  try {
    results = await searchYoutube(searchQuery, options);
  } catch (err) {
    return {
      ...emptySuggestion(ex, "search_failed"),
      searchQuery,
      error: String(err),
    };
  }

  if (results.length === 0) {
    return { ...emptySuggestion(ex, "no_results"), searchQuery };
  }

  let best = null;
  let bestScore = -1;
  for (const r of results) {
    const verified = await verifyYoutubeVideo(r.url, options);
    if (!verified.ok) continue;
    const title = verified.title || r.title;
    const score = rankVideoCandidate(ex.name, title, verified.channelTitle || r.channelTitle);
    if (score > bestScore) {
      bestScore = score;
      best = { ...r, verified, score };
    }
  }

  if (!best) {
    const first = results[0];
    const verified = await verifyYoutubeVideo(first.url, options);
    if (!verified.ok) {
      return {
        ...emptySuggestion(ex, "verify_failed"),
        searchQuery,
        error: verified.reason,
      };
    }
    best = { ...first, verified, score: 0 };
  }

  const confidence =
    best.score >= 0.5 ? "high" : best.score >= 0.25 ? "medium" : "low";

  return {
    suggestedVideoUrl: best.verified.url,
    youtubeVideoId: best.verified.videoId,
    videoTitle: best.verified.title || best.title,
    channelTitle: best.verified.channelTitle || best.channelTitle,
    searchQuery,
    strategy: "youtube_search",
    confidence,
    verified: true,
    titleMatchScore: best.score,
  };
}

/**
 * Safe to bulk-approve without watching (still spot-check random samples).
 * @param {Record<string, string>} row
 */
export function shouldAutoApprove(row) {
  const url = (row.suggestedVideoUrl || row.finalVideoUrl || "").trim();
  if (!url || row.verified !== "yes") return false;
  if ((row.reviewStatus || "").toLowerCase() === "rejected") return false;

  const score = Number.parseFloat(row.titleMatchScore);
  const title = row.videoTitle || "";
  const name = row.name || "";

  if (row.strategy === "duplicate_name") return true;
  if (row.confidence === "high" && score >= 0.5) {
    if (DEMO_TITLE_RE.test(title)) return true;
    if (score >= 0.75 && !OVERVIEW_TITLE_RE.test(title)) return true;
    if (titleMatchScore(name, title) >= 0.85) return true;
  }
  if (row.confidence === "medium" && score >= 0.75 && DEMO_TITLE_RE.test(title)) {
    return true;
  }
  return false;
}

function emptySuggestion(ex, strategy) {
  return {
    suggestedVideoUrl: "",
    youtubeVideoId: "",
    videoTitle: "",
    channelTitle: "",
    searchQuery: buildYoutubeSearchQuery(ex),
    strategy,
    confidence: "none",
    verified: false,
  };
}
