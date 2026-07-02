"use client";

import { useState, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { exercises } from "@/core/catalog";
import { CATEGORIES, CATEGORY_ORDER } from "@/core/catalog";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import CategoryBadge from "@/components/common/CategoryBadge";
import { EQUIPMENT_LABELS, exerciseMatchesEquipment } from "@/data/equipment";
import EmptyState from "@/components/common/EmptyState";
import {
  DislikeIcon,
  FavoriteIcon,
  FavoriteIconOutline,
  ReportIcon,
} from "@/components/common/ExercisePreferenceIcons";
import ExerciseReportSheet from "@/components/feedback/ExerciseReportSheet";
import {
  EXPERTISE_LEVEL_LABELS,
  EXPERTISE_LEVEL_ORDER,
  exerciseExpertiseLevel,
  exerciseMeetsExpertiseCap,
  resolveExpertiseFilter,
} from "@/lib/expertiseLevels";
import type { Exercise, ExerciseCategory, ExpertiseLevel } from "@/types";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAuthStore } from "@/stores/useAuthStore";
import AccountFeatureGate from "@/components/auth/AccountFeatureGate";
import { buildExerciseSettingsClearRepSuggestionIgnore } from "@/lib/applyRepIncreaseSuggestion";
import { exerciseVideoLinkLabel } from "@/lib/exerciseVideoLink";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  isPresetTimerSeconds,
  parseRepTargetHint,
  resolveExerciseSettings,
  TIMER_DURATION_PRESET_SECONDS,
} from "@/utils/effectiveExerciseSettings";

const chipRowClass = "flex gap-2 overflow-x-auto pb-1 scrollbar-hide";

function LibraryFilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-muted px-1">
        {label}
        <span className="font-normal text-muted/80">
          {" "}
          · tap to select multiple
        </span>
      </p>
      <div className={`${chipRowClass} -mx-4 px-4`}>{children}</div>
    </div>
  );
}

export default function LibraryPageContent() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    Set<ExerciseCategory>
  >(() => new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<
    Set<ExpertiseLevel>
  >(() => new Set());
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [withinMyLevel, setWithinMyLevel] = useState(false);

  function toggleCategory(cat: ExerciseCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleDifficulty(level: ExpertiseLevel) {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const expertiseByGroup = useSettingsStore((s) => s.expertiseByGroup);
  const authMode = useAuthStore((s) => s.mode);

  const expertiseFilter = useMemo(
    () => resolveExpertiseFilter({ expertiseByGroup }),
    [expertiseByGroup],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const level = exerciseExpertiseLevel(ex);
      const levelLabel = EXPERTISE_LEVEL_LABELS[level];

      const matchesSearch =
        q === "" ||
        ex.name.toLowerCase().includes(q) ||
        ex.id.toLowerCase().includes(q) ||
        ex.notes.toLowerCase().includes(q) ||
        level.includes(q) ||
        levelLabel.toLowerCase().includes(q) ||
        (ex.muscleGroups?.some((m) => m.toLowerCase().includes(q)) ?? false);

      const matchesCategory =
        selectedCategories.size === 0 || selectedCategories.has(ex.category);

      const matchesDifficulty =
        selectedDifficulties.size === 0 || selectedDifficulties.has(level);

      const matchesEquipment =
        showUnavailable ||
        exerciseMatchesEquipment(ex.equipment, availableEquipment);

      const matchesExpertise =
        !withinMyLevel ||
        exerciseMeetsExpertiseCap(ex, ex.category, expertiseFilter.byGroup);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDifficulty &&
        matchesEquipment &&
        matchesExpertise
      );
    });
  }, [
    search,
    selectedCategories,
    selectedDifficulties,
    showUnavailable,
    withinMyLevel,
    availableEquipment,
    expertiseFilter,
  ]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof exercises> = {};
    for (const ex of filtered) {
      if (!groups[ex.category]) groups[ex.category] = [];
      groups[ex.category].push(ex);
    }
    return groups;
  }, [filtered]);

  const visibleCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0),
    [grouped],
  );

  const filtersActive =
    selectedCategories.size > 0 ||
    selectedDifficulties.size > 0 ||
    showUnavailable ||
    withinMyLevel;

  return (
    <div className="flex flex-col py-6 gap-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exercise Library</h1>
        <p className="text-sm text-muted mt-1">
          {filtered.length} shown · {exercises.length} total
        </p>
      </div>

      {authMode === "guest" && (
        <AccountFeatureGate feature="libraryPreferences" />
      )}

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
          placeholder="Search name, muscle, or difficulty…"
          className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
        />
      </div>

      <CollapsibleSection
        flat
        title="Filters"
        hint={""}
        defaultOpen
        contentClassName="flex flex-col gap-4"
      >
        <LibraryFilterRow label="Category">
          <button
            type="button"
            onClick={() => setSelectedCategories(new Set())}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategories.size === 0
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            All
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategories.has(cat)}
              onClick={() => toggleCategory(cat)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategories.has(cat)
                  ? `${CATEGORIES[cat].bgColor} ${CATEGORIES[cat].textColor}`
                  : "bg-surface text-muted hover:text-foreground border border-border"
              }`}
            >
              {CATEGORIES[cat].shortName}
            </button>
          ))}
        </LibraryFilterRow>

        <LibraryFilterRow label="Difficulty">
          <button
            type="button"
            onClick={() => setSelectedDifficulties(new Set())}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedDifficulties.size === 0
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            All
          </button>
          {EXPERTISE_LEVEL_ORDER.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={selectedDifficulties.has(level)}
              onClick={() => toggleDifficulty(level)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedDifficulties.has(level)
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground border border-border"
              }`}
            >
              {EXPERTISE_LEVEL_LABELS[level]}
            </button>
          ))}
        </LibraryFilterRow>

        <LibraryFilterRow label="More">
          <button
            type="button"
            onClick={() => {
              setShowUnavailable(false);
              setWithinMyLevel(false);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !showUnavailable && !withinMyLevel
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={showUnavailable}
            title="Show exercises that need equipment you haven't selected (Settings → Your equipment)"
            onClick={() => setShowUnavailable((v) => !v)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              showUnavailable
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            Need equipment
          </button>
          <button
            type="button"
            aria-pressed={withinMyLevel}
            title="Only show exercises at or below my skill level (Settings → Exercise difficulty)"
            onClick={() => setWithinMyLevel((v) => !v)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              withinMyLevel
                ? "bg-accent text-white"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            My level
          </button>
        </LibraryFilterRow>
      </CollapsibleSection>

      {/* Exercise list */}
      <div className="flex flex-col gap-6">
        <AnimatePresence mode="popLayout">
          {visibleCategories.map((cat, index) => {
            const count = grouped[cat]!.length;
            return (
              <motion.div
                key={cat}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                <CollapsibleSection
                  flat
                  hintInline
                  title={
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORIES[cat].color }}
                        aria-hidden
                      />
                      {CATEGORIES[cat].name}
                    </span>
                  }
                  hint={String(count)}
                  defaultOpen={false}
                  contentClassName="flex flex-col gap-1"
                >
                  {grouped[cat]!.map((ex) => (
                    <ExerciseCard key={ex.id} exercise={ex} />
                  ))}
                </CollapsibleSection>
              </motion.div>
            );
          })}
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

function ExercisePreferenceToggles({ exercise }: { exercise: Exercise }) {
  const mode = useAuthStore((s) => s.mode);
  const preference = useExercisePreferencesStore(
    (s) => s.byExerciseId[exercise.id],
  );
  const setPreference = useExercisePreferencesStore((s) => s.setPreference);
  const [reportOpen, setReportOpen] = useState(false);

  if (mode !== "authenticated") return null;

  const isFavorite = preference === "favorite";
  const isDisliked = preference === "disliked";

  return (
    <>
      <div
        className="flex shrink-0 items-center gap-0.5"
        role="group"
        aria-label="Exercise preferences"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() =>
            void setPreference(exercise.id, isFavorite ? null : "favorite")
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
          {isFavorite ? (
            <FavoriteIcon size={20} />
          ) : (
            <FavoriteIconOutline size={20} />
          )}
        </button>
        <button
          type="button"
          onClick={() =>
            void setPreference(exercise.id, isDisliked ? null : "disliked")
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
          <DislikeIcon size={20} />
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Report an issue"
          aria-label="Report an issue with this exercise"
        >
          <ReportIcon size={20} />
        </button>
      </div>
      <ExerciseReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        exercise={exercise}
        source="library"
      />
    </>
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
    "rounded-lg px-2.5 py-1 text-sm font-medium transition-colors border";

  const presetChipClass =
    "rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors";

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
          <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground leading-snug">
            {exercise.name}
            <span className="rounded-md border border-border bg-surface-hover px-1.5 py-0.5 text-caption font-medium text-muted">
              {EXPERTISE_LEVEL_LABELS[exerciseExpertiseLevel(exercise)]}
            </span>
          </span>
          {exercise.equipment && exercise.equipment.length > 0 ? (
            <span className="text-xs text-muted leading-snug">
              {exercise.equipment.map((eq) => EQUIPMENT_LABELS[eq]).join(" · ")}
            </span>
          ) : (
            <span className="text-xs text-muted">Bodyweight</span>
          )}
        </button>
        <ExercisePreferenceToggles exercise={exercise} />
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
            <div className="flex flex-col border-t border-border px-3 py-3 gap-2">
              <p className="text-caption font-mono text-muted">{exercise.id}</p>
              <p className="text-xs text-muted">{exercise.notes}</p>
              {exercise.source && (
                <p className="text-caption text-muted">
                  Source: {exercise.source}
                </p>
              )}
              {exercise.secondaryCategory && (
                <div className="flex items-center gap-1">
                  <span className="text-caption text-muted">Also:</span>
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {exerciseVideoLinkLabel(exercise.videoUrl) ===
                    "Watch video" ? (
                      <polygon points="5 3 19 12 5 21 5 3" />
                    ) : (
                      <>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </>
                    )}
                  </svg>
                  {exerciseVideoLinkLabel(exercise.videoUrl)}
                </a>
              )}

              <div className="flex flex-col mt-3 gap-2 border-t border-border py-3">
                <p className="text-caption font-medium uppercase tracking-wide text-muted">
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
                  <div className="flex flex-col gap-2">
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
                      <div className="flex flex-col gap-1.5 py-0.5">
                        <label className="text-caption font-medium uppercase tracking-wide text-muted">
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
                  <div className="flex flex-col gap-3 py-0.5">
                    <div className="flex flex-col gap-2.5">
                      <label className="text-caption font-medium uppercase tracking-wide text-muted">
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
                    <p className="text-caption text-muted">
                      Clear the field and tap away to use the catalog line (
                      {exercise.defaultReps}) until you set a number.
                    </p>
                  </div>
                )}
                {stored?.repSuggestionIgnored || stored?.repSuggestionSnoozedUntil ? (
                  <div className="flex flex-col gap-2 border-t border-border pt-3">
                    <p className="text-caption font-medium uppercase tracking-wide text-muted">
                      Rep suggestions
                    </p>
                    {stored.repSuggestionIgnored ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted">
                          Ignored for increase suggestions
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            void upsert(
                              exercise.id,
                              buildExerciseSettingsClearRepSuggestionIgnore(
                                exercise.id,
                                stored,
                              ),
                            )
                          }
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Allow
                        </button>
                      </div>
                    ) : stored.repSuggestionSnoozedUntil ? (
                      <p className="text-xs text-muted">
                        Snoozed until {stored.repSuggestionSnoozedUntil}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
