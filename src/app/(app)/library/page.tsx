"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { exercises } from "@/data/exercises";
import { CATEGORIES, CATEGORY_ORDER } from "@/data/categories";
import CategoryBadge from "@/components/common/CategoryBadge";
import { EQUIPMENT_LABELS, exerciseMatchesEquipment } from "@/data/equipment";
import EmptyState from "@/components/common/EmptyState";
import type { Exercise, ExerciseCategory } from "@/types";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  isPresetTimerSeconds,
  parseRepTargetHint,
  resolveExerciseSettings,
  TIMER_DURATION_PRESET_SECONDS,
} from "@/utils/effectiveExerciseSettings";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ExerciseCategory | "all">(
    "all",
  );
  const [showUnavailable, setShowUnavailable] = useState(false);
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const authMode = useAuthStore((s) => s.mode);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        search === "" ||
        ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.id.toLowerCase().includes(search.toLowerCase()) ||
        ex.notes.toLowerCase().includes(search.toLowerCase()) ||
        (ex.muscleGroups?.some((m) =>
          m.toLowerCase().includes(search.toLowerCase()),
        ) ??
          false);

      const matchesCategory =
        activeFilter === "all" || ex.category === activeFilter;

      const matchesEquipment =
        showUnavailable ||
        exerciseMatchesEquipment(ex.equipment, availableEquipment);

      return matchesSearch && matchesCategory && matchesEquipment;
    });
  }, [search, activeFilter, showUnavailable, availableEquipment]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof exercises> = {};
    for (const ex of filtered) {
      if (!groups[ex.category]) groups[ex.category] = [];
      groups[ex.category].push(ex);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exercise Library</h1>
        <p className="text-sm text-muted mt-1">
          {filtered.length} shown · {exercises.length} total
        </p>
      </div>

      {authMode === "guest" && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted leading-relaxed">
          <span className="text-foreground font-medium">Guest mode: </span>
          Prescribed workouts use the default plan.{" "}
          <Link
            href="/signup"
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>{" "}
          or{" "}
          <Link
            href="/login"
            className="font-medium text-accent hover:underline"
          >
            log in
          </Link>{" "}
          to save favorites and dislikes and get a personalized weekly plan.
        </div>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showUnavailable}
          onChange={(e) => setShowUnavailable(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
        />
        <span className="text-xs text-muted leading-relaxed">
          Show exercises that need equipment you haven&apos;t selected in{" "}
          <span className="text-foreground">Settings → Your equipment</span>
        </span>
      </label>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setActiveFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeFilter === "all"
              ? "bg-accent text-white"
              : "bg-surface text-muted hover:text-foreground border border-border"
          }`}
        >
          All
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat === activeFilter ? "all" : cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === cat
                ? `${CATEGORIES[cat].bgColor} ${CATEGORIES[cat].textColor}`
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            {CATEGORIES[cat].shortName}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <motion.div
              key={cat}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CATEGORIES[cat].color }}
                />
                <h2 className="text-sm font-semibold text-foreground">
                  {CATEGORIES[cat].name}
                </h2>
                <span className="text-xs text-muted">
                  ({grouped[cat].length})
                </span>
              </div>

              <div className="space-y-1">
                {grouped[cat].map((ex) => (
                  <ExerciseCard key={ex.id} exercise={ex} />
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <EmptyState
            title="No exercises match your search."
            className="py-12"
          />
        )}
      </div>
    </div>
  );
}

function ExercisePreferenceToggles({ exerciseId }: { exerciseId: string }) {
  const mode = useAuthStore((s) => s.mode);
  const preference = useExercisePreferencesStore(
    (s) => s.byExerciseId[exerciseId],
  );
  const setPreference = useExercisePreferencesStore((s) => s.setPreference);

  if (mode !== "authenticated") return null;

  const isFavorite = preference === "favorite";
  const isDisliked = preference === "disliked";

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      role="group"
      aria-label="Exercise preferences"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() =>
          void setPreference(exerciseId, isFavorite ? null : "favorite")
        }
        className={`rounded-lg p-1.5 transition-colors ${
          isFavorite
            ? "text-amber-400 bg-amber-400/15"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
        title={isFavorite ? "Remove from favorites" : "Favorite"}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill={isFavorite ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() =>
          void setPreference(exerciseId, isDisliked ? null : "disliked")
        }
        className={`rounded-lg p-1.5 transition-colors ${
          isDisliked
            ? "text-rose-400 bg-rose-400/15"
            : "text-muted hover:bg-surface-hover hover:text-foreground"
        }`}
        title={
          isDisliked
            ? "Remove exclusion (neutral)"
            : "Exclude from generated plans"
        }
        aria-pressed={isDisliked}
        aria-label={
          isDisliked
            ? "Allow in personalized plans"
            : "Exclude from personalized plans"
        }
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="5" y1="5" x2="19" y2="19" />
        </svg>
      </button>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const [customChipActive, setCustomChipActive] = useState(false);
  const stored = useExerciseSettingsStore((s) => s.byExerciseId[exercise.id]);
  const upsert = useExerciseSettingsStore((s) => s.upsert);

  const resolved = useMemo(
    () => resolveExerciseSettings(exercise, stored),
    [exercise, stored],
  );

  const effectiveSec: number =
    stored?.defaultTimerSeconds ??
    (resolved.defaultSetMode === "timer"
      ? (resolved.defaultTimerSeconds ?? DEFAULT_TIMER_SECONDS_FALLBACK)
      : DEFAULT_TIMER_SECONDS_FALLBACK);

  const showCustomInput =
    resolved.defaultSetMode === "timer" &&
    (customChipActive || !isPresetTimerSeconds(effectiveSec));

  async function setMode(mode: "reps" | "timer") {
    if (mode === "reps") {
      setCustomChipActive(false);
      await upsert(exercise.id, {
        defaultSetMode: "reps",
        defaultTimerSeconds: null,
        defaultTargetReps:
          stored?.defaultTargetReps != null && stored.defaultTargetReps > 0
            ? stored.defaultTargetReps
            : null,
      });
      return;
    }
    setCustomChipActive(false);
    await upsert(exercise.id, {
      defaultSetMode: "timer",
      defaultTargetReps: null,
      defaultTimerSeconds:
        stored?.defaultSetMode === "timer" &&
        stored.defaultTimerSeconds != null &&
        stored.defaultTimerSeconds > 0
          ? stored.defaultTimerSeconds
          : DEFAULT_TIMER_SECONDS_FALLBACK,
    });
  }

  async function pickTimerPreset(sec: number) {
    setCustomChipActive(false);
    await upsert(exercise.id, {
      defaultSetMode: "timer",
      defaultTargetReps: null,
      defaultTimerSeconds: sec,
    });
  }

  async function commitCustomSecondsFromInput(input: HTMLInputElement) {
    const n = Math.round(Number(input.value));
    const sec = Math.min(
      999,
      Math.max(5, Number.isNaN(n) ? DEFAULT_TIMER_SECONDS_FALLBACK : n),
    );
    input.value = String(sec);
    await upsert(exercise.id, {
      defaultSetMode: "timer",
      defaultTargetReps: null,
      defaultTimerSeconds: sec,
    });
    setCustomChipActive(false);
  }

  async function commitDefaultRepsFromInput(input: HTMLInputElement) {
    const raw = input.value.trim();
    if (raw === "") {
      await upsert(exercise.id, {
        defaultSetMode: "reps",
        defaultTimerSeconds: null,
        defaultTargetReps: null,
      });
      return;
    }
    const n = Math.round(Number(raw));
    const reps = Math.min(
      999,
      Math.max(
        1,
        Number.isNaN(n) ? (parseRepTargetHint(exercise.defaultReps) ?? 1) : n,
      ),
    );
    input.value = String(reps);
    await upsert(exercise.id, {
      defaultSetMode: "reps",
      defaultTimerSeconds: null,
      defaultTargetReps: reps,
    });
  }

  const modeBtn =
    "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors border";

  const presetChipClass =
    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors";

  const customChipSelected =
    customChipActive ||
    (resolved.defaultSetMode === "timer" &&
      !isPresetTimerSeconds(effectiveSec));

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="flex w-full min-h-[48px] items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => {
              if (prev) setCustomChipActive(false);
              return !prev;
            });
          }}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-0.5 text-left"
        >
          <span className="text-sm font-medium text-foreground leading-snug">
            {exercise.name}
          </span>
          {exercise.equipment && exercise.equipment.length > 0 ? (
            <span className="text-xs text-muted leading-snug">
              {exercise.equipment.map((eq) => EQUIPMENT_LABELS[eq]).join(" · ")}
            </span>
          ) : (
            <span className="text-xs text-muted">Bodyweight</span>
          )}
        </button>
        <ExercisePreferenceToggles exerciseId={exercise.id} />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 py-3 space-y-2">
              <p className="text-[10px] font-mono text-muted">{exercise.id}</p>
              <p className="text-xs text-muted">{exercise.notes}</p>
              {exercise.source && (
                <p className="text-[10px] text-muted">
                  Source: {exercise.source}
                </p>
              )}
              {exercise.secondaryCategory && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted">Also:</span>
                  <CategoryBadge category={exercise.secondaryCategory} />
                </div>
              )}
              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Watch video
                </a>
              )}

              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                  Default logging
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void setMode("reps")}
                    className={`${modeBtn} ${
                      resolved.defaultSetMode === "reps"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:text-foreground"
                    }`}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    onClick={() => void setMode("timer")}
                    className={`${modeBtn} ${
                      resolved.defaultSetMode === "timer"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:text-foreground"
                    }`}
                  >
                    Timer
                  </button>
                </div>
                {resolved.defaultSetMode === "timer" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {TIMER_DURATION_PRESET_SECONDS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => void pickTimerPreset(sec)}
                          className={`${presetChipClass} ${
                            !customChipSelected && effectiveSec === sec
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-border bg-surface-hover text-muted hover:text-foreground"
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomChipActive(true)}
                        className={`${presetChipClass} ${
                          customChipSelected
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-surface-hover text-muted hover:text-foreground"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                    {showCustomInput && (
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <label className="text-[10px] font-medium uppercase tracking-wide text-muted">
                          Seconds
                        </label>
                        <input
                          key={`custom-sec-${exercise.id}-${effectiveSec}-${customChipActive}`}
                          type="number"
                          inputMode="numeric"
                          min={5}
                          max={999}
                          defaultValue={effectiveSec}
                          onBlur={(e) =>
                            void commitCustomSecondsFromInput(e.currentTarget)
                          }
                          className="w-full max-w-34 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                    )}
                  </div>
                )}
                {resolved.defaultSetMode === "reps" && (
                  <div className="space-y-3 pt-0.5">
                    <div className="flex flex-col gap-2.5">
                      <label className="text-[10px] font-medium uppercase tracking-wide text-muted">
                        Default reps
                      </label>
                      <input
                        key={`default-reps-${exercise.id}-${stored?.defaultTargetReps ?? ""}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={999}
                        defaultValue={
                          resolved.defaultTargetReps ??
                          parseRepTargetHint(exercise.defaultReps) ??
                          ""
                        }
                        onBlur={(e) =>
                          void commitDefaultRepsFromInput(e.currentTarget)
                        }
                        className="w-full max-w-32 rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>
                    <p className="text-[10px] text-muted">
                      Clear the field and tap away to use the catalog line (
                      {exercise.defaultReps}) until you set a number.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
