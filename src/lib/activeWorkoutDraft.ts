import type { WorkoutLog } from "@/types";
import { migrateWorkoutLog } from "@/lib/cpToPcMigration";
import { isStaleSessionDate } from "@/lib/workoutSessionStale";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { findCompletedWorkoutForDate } from "@/utils/workoutLogLookup";
import type { AuthMode } from "@/stores/useAuthStore";

const DRAFT_KEY_PREFIX = "exercise-app-active-workout-draft";
const DRAFT_VERSION = 1;

export type ActiveWorkoutDraftMeta = {
  savedAt: string;
  /** User chose Save for later — do not auto-resume until Resume. */
  paused: boolean;
};

type ActiveWorkoutDraftPayload = {
  v: typeof DRAFT_VERSION;
  meta: ActiveWorkoutDraftMeta;
  log: WorkoutLog;
};

export type DraftAuthScope = {
  mode: AuthMode;
  userId: string | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(scope: DraftAuthScope): string {
  if (scope.mode === "authenticated" && scope.userId) {
    return `${DRAFT_KEY_PREFIX}:${scope.userId}`;
  }
  return DRAFT_KEY_PREFIX;
}

function parsePayload(raw: string): ActiveWorkoutDraftPayload | null {
  try {
    const parsed = JSON.parse(raw) as ActiveWorkoutDraftPayload;
    if (parsed?.v !== DRAFT_VERSION || !parsed.log?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Guests only — authenticated users persist in-progress rows via Supabase. */
export function usesLocalWorkoutDraft(scope: DraftAuthScope): boolean {
  return scope.mode !== "authenticated";
}

export function loadActiveWorkoutDraft(
  scope: DraftAuthScope,
): ActiveWorkoutDraftPayload | null {
  if (!usesLocalWorkoutDraft(scope) || !isBrowser()) return null;
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const payload = parsePayload(raw);
    if (!payload) return null;
    return {
      ...payload,
      log: migrateWorkoutLog(payload.log),
    };
  } catch {
    return null;
  }
}

export function saveActiveWorkoutDraft(
  scope: DraftAuthScope,
  log: WorkoutLog,
  meta: Pick<ActiveWorkoutDraftMeta, "paused"> & { savedAt?: string },
): void {
  if (!usesLocalWorkoutDraft(scope) || !isBrowser()) return;
  const payload: ActiveWorkoutDraftPayload = {
    v: DRAFT_VERSION,
    meta: {
      savedAt: meta.savedAt ?? new Date().toISOString(),
      paused: meta.paused,
    },
    log,
  };
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearActiveWorkoutDraft(scope: DraftAuthScope): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(storageKey(scope));
  } catch {
    /* ignore */
  }
}

/** In-progress draft that should not auto-resume (explicit pause). */
export function getPausedDraftDate(
  scope: DraftAuthScope,
  todayKey: string = formatLocalDateKey(),
): string | null {
  if (!usesLocalWorkoutDraft(scope)) return null;
  const payload = loadActiveWorkoutDraft(scope);
  if (!payload?.meta.paused || payload.log.endTime) return null;
  if (payload.log.date !== todayKey) return null;
  return payload.log.date;
}

/**
 * Whether a stored draft should be loaded into `activeWorkout` on app start.
 * Skips paused drafts and drafts whose calendar day already has a completed log.
 */
export function shouldAutoRestoreDraft(
  scope: DraftAuthScope,
  history: WorkoutLog[],
  todayKey: string = formatLocalDateKey(),
): WorkoutLog | null {
  if (!usesLocalWorkoutDraft(scope)) return null;
  const payload = loadActiveWorkoutDraft(scope);
  if (!payload) return null;
  if (payload.meta.paused) return null;
  if (payload.log.endTime) {
    clearActiveWorkoutDraft(scope);
    return null;
  }
  if (isStaleSessionDate(payload.log.date, todayKey)) {
    if (!payload.meta.paused) {
      saveActiveWorkoutDraft(scope, payload.log, { paused: true });
    }
    return null;
  }
  if (payload.log.date !== todayKey) {
    clearActiveWorkoutDraft(scope);
    return null;
  }
  if (findCompletedWorkoutForDate(history, payload.log.date)) {
    clearActiveWorkoutDraft(scope);
    return null;
  }
  return payload.log;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersistActiveWorkoutDraft(
  scope: DraftAuthScope,
  log: WorkoutLog,
): void {
  if (!usesLocalWorkoutDraft(scope) || !isBrowser()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    saveActiveWorkoutDraft(scope, log, { paused: false });
  }, 250);
}

export function cancelScheduledPersistActiveWorkoutDraft(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

export function flushPersistActiveWorkoutDraft(
  scope: DraftAuthScope,
  log: WorkoutLog,
): void {
  cancelScheduledPersistActiveWorkoutDraft();
  saveActiveWorkoutDraft(scope, log, { paused: false });
}
