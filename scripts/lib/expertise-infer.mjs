/**
 * Heuristic expertiseLevel from exercise name, equipment, category, optional HC rank.
 */

const EXPERTISE_LEVELS = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "expert",
];

const LEVEL_RANK = Object.fromEntries(EXPERTISE_LEVELS.map((l, i) => [l, i]));

function maxLevel(a, b) {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

function minLevel(a, b) {
  return LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
}

/** HC progression index 1..N on a page → level. */
function expertiseFromProgressionIndex(index, total) {
  if (total <= 1) return "intermediate";
  const t = (index - 1) / Math.max(1, total - 1);
  if (t <= 0.15) return "beginner";
  if (t <= 0.35) return "novice";
  if (t <= 0.55) return "intermediate";
  if (t <= 0.8) return "advanced";
  return "expert";
}

export function inferExpertiseLevel(exercise, { progressionIndex, progressionTotal } = {}) {
  if (progressionIndex != null && progressionTotal != null) {
    return expertiseFromProgressionIndex(progressionIndex, progressionTotal);
  }

  const name = exercise.name ?? "";
  const n = name.toLowerCase();
  const equip = exercise.equipment ?? [];
  const cat = exercise.category ?? "";

  if (cat === "SW" || cat === "SC") return "beginner";

  let level = "intermediate";

  if (
    /\b(wall push|incline push|knee push|assisted|negative|regression|beginner|easy|modified)\b/i.test(
      n,
    )
  ) {
    level = "beginner";
  } else if (/\b(handstand|planche|muscle[- ]?up|one[- ]?arm|freestanding|pistol|archer)\b/i.test(n)) {
    level = "expert";
  } else if (
    /\b(advanced|weighted|deficit|explosive|clap|360|freestanding|strict|full)\b/i.test(n) &&
    !/\bincline\b/i.test(n)
  ) {
    level = "advanced";
  } else if (/\b(ring|lever|l[- ]?sit|v[- ]?sit|dragon|flag)\b/i.test(n)) {
    level = maxLevel(level, "advanced");
  } else if (/\b(decline|diamond|pike|pseudo|bulgarian|single[- ]?leg)\b/i.test(n)) {
    level = maxLevel(level, "advanced");
  } else if (/\b(pull[- ]?up|chin[- ]?up|dip|push[- ]?up|squat|lunge|row)\b/i.test(n)) {
    level = minLevel(level, "novice");
  }

  if (equip.includes("machine") || equip.includes("cable")) {
    level = minLevel(level, "intermediate");
    if (!/\b(advanced|expert|one[- ]?arm|handstand)\b/i.test(n)) {
      level = minLevel(level, "novice");
    }
  }

  if (equip.includes("barbell") && /\b(squat|deadlift|bench|press|row)\b/i.test(n)) {
    level = maxLevel(level, "intermediate");
  }

  if (equip.includes("rings")) {
    level = maxLevel(level, "intermediate");
  }

  if (/\b(walk|jog|hike|cycle|swim)\b/i.test(n) || cat === "PC") {
    level = "beginner";
  }

  if (exercise.isTimeBased && /\b(plank|hold|hang)\b/i.test(n)) {
    level = minLevel(level, "novice");
  }

  return level;
}
