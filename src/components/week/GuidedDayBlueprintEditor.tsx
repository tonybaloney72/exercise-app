"use client";

import SurfaceCard from "@/components/common/SurfaceCard";
import DayBlueprintCardioEditor from "@/components/week/DayBlueprintCardioEditor";
import {
  LAYOUT_GROUP_LABELS,
  LAYOUT_GROUP_ORDER,
} from "@/lib/weeklyCategoryLayout";
import {
  addRoundInBlueprint,
  applyRoundCloneFromPrior,
  DAY_BLUEPRINT_KIND_LABELS,
  describeDayBlueprint,
  MAX_BLUEPRINT_ROUNDS,
  removeRoundInBlueprint,
  setDayCardioInBlueprint,
  setDayKindInBlueprint,
  setRoundExerciseCount,
  toggleGroupInRound,
} from "@/lib/weekBlueprintDraft";
import type {
  DayBlueprint,
  DayBlueprintKind,
  WeekBlueprint,
} from "@/lib/weekBlueprint";
import {
  warningsForDay,
  type WeekBlueprintWarning,
} from "@/lib/weekBlueprintWarnings";
import { ROUND_DENSITY_TARGETS } from "@/lib/programProfile";
import { uiChoicePillClass } from "@/lib/uiClasses";
import { useSettingsStore } from "@/stores/useSettingsStore";

const DAY_KINDS: DayBlueprintKind[] = [
  "workout",
  "active_recovery",
  "stretches",
  "full_rest",
];

const uiRoundCountInput =
  "w-24 min-h-9 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-left text-foreground tabular-nums";

type Props = {
  dayOfWeek: number;
  day: DayBlueprint;
  blueprint: WeekBlueprint;
  warnings: WeekBlueprintWarning[];
  onChange: (updater: (prev: WeekBlueprint) => WeekBlueprint) => void;
};

export default function GuidedDayBlueprintEditor({
  dayOfWeek,
  day,
  blueprint,
  warnings,
  onChange,
}: Props) {
  const roundDensity = useSettingsStore((s) => s.roundDensity);
  const defaultExerciseCount = Math.max(
    2,
    Math.min(8, ROUND_DENSITY_TARGETS[roundDensity]),
  );
  const dayWarnings = warningsForDay(warnings, dayOfWeek);
  const hasRounds =
    day.dayKind === "workout" || day.dayKind === "active_recovery";
  const canAddRound = day.rounds.length < MAX_BLUEPRINT_ROUNDS;

  return (
    <div className="space-y-4">
      {dayWarnings.length > 0 ? (
        <ul className="space-y-1">
          {dayWarnings.map((w) => (
            <li
              key={w.id}
              className="text-xs text-amber-600 dark:text-amber-400 leading-snug"
            >
              {w.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">Day type</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {DAY_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={day.dayKind === kind}
              onClick={() =>
                onChange((prev) =>
                  setDayKindInBlueprint(prev, dayOfWeek, kind),
                )
              }
              className={uiChoicePillClass(day.dayKind === kind)}
            >
              {DAY_BLUEPRINT_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      </div>

      {hasRounds ? (
        <>
          <div className="space-y-3">
            {day.rounds.map((round, roundIndex) => (
              <SurfaceCard
                key={roundIndex}
                className="p-3 space-y-2 bg-surface-hover/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Round {roundIndex + 1}
                    </p>
                    {round.cloneOfRoundIndex != null && round.cloneMode ? (
                      <p className="text-caption text-muted mt-0.5">
                        {round.cloneMode === "repeat"
                          ? `Same exercises as round ${round.cloneOfRoundIndex + 1}`
                          : `Same groups as round ${round.cloneOfRoundIndex + 1}, new picks`}
                      </p>
                    ) : null}
                  </div>
                  {day.rounds.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) =>
                          removeRoundInBlueprint(
                            prev,
                            dayOfWeek,
                            roundIndex,
                          ),
                        )
                      }
                      className="shrink-0 text-xs text-muted hover:text-foreground"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={`Round ${roundIndex + 1} groups`}
                >
                  {LAYOUT_GROUP_ORDER.map((group) => {
                    const on = round.groups.includes(group);
                    return (
                      <button
                        key={group}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          onChange((prev) =>
                            toggleGroupInRound(
                              prev,
                              dayOfWeek,
                              roundIndex,
                              group,
                            ),
                          )
                        }
                        className={uiChoicePillClass(on)}
                      >
                        {LAYOUT_GROUP_LABELS[group]}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor={`round-${dayOfWeek}-${roundIndex}-count`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Exercises in this round
                  </label>
                  <p className="text-[11px] text-muted leading-snug">
                    Optional — leave blank for ~{defaultExerciseCount}{" "}
                    exercises.
                  </p>
                  <input
                    id={`round-${dayOfWeek}-${roundIndex}-count`}
                    type="number"
                    min={1}
                    max={8}
                    inputMode="numeric"
                    value={round.exerciseCount ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      onChange(
                        (prev) =>
                          setRoundExerciseCount(
                            prev,
                            dayOfWeek,
                            roundIndex,
                            raw === ""
                              ? undefined
                              : Number.parseInt(raw, 10) || undefined,
                          ),
                      );
                    }}
                    className={uiRoundCountInput}
                    aria-label={`Exercise count for round ${roundIndex + 1}`}
                  />
                </div>

                {roundIndex > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) =>
                          applyRoundCloneFromPrior(
                            prev,
                            dayOfWeek,
                            roundIndex,
                            "repeat",
                          ),
                        )
                      }
                      className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
                    >
                      Match prior round (repeat exercises)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) =>
                          applyRoundCloneFromPrior(
                            prev,
                            dayOfWeek,
                            roundIndex,
                            "structure",
                          ),
                        )
                      }
                      className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-hover"
                    >
                      Match prior round (new exercises)
                    </button>
                  </div>
                ) : null}
              </SurfaceCard>
            ))}

            {canAddRound ? (
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => addRoundInBlueprint(prev, dayOfWeek))
                }
                className="w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-sm font-medium text-muted hover:border-accent/40 hover:text-foreground"
              >
                + Add round
              </button>
            ) : (
              <p className="text-xs text-muted text-center">
                Maximum {MAX_BLUEPRINT_ROUNDS} rounds per day.
              </p>
            )}
          </div>

          <DayBlueprintCardioEditor
            value={day.cardio ?? []}
            onChange={(cardio) =>
              onChange((prev) =>
                setDayCardioInBlueprint(prev, dayOfWeek, cardio),
              )
            }
          />
        </>
      ) : null}

      <p className="text-xs text-muted border-t border-border/60 pt-2">
        {describeDayBlueprint(day)}
      </p>
    </div>
  );
}
