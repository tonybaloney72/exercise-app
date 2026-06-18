"use client";

import { useEffect, useState } from "react";
import SurfaceCard from "@/components/common/SurfaceCard";
import DayBlueprintCardioEditor from "@/components/week/DayBlueprintCardioEditor";
import {
  LAYOUT_GROUP_LABELS,
  LAYOUT_GROUP_ORDER,
} from "@/lib/weeklyCategoryLayout";
import {
  applyRoundCloneFromPrior,
  copyDayInBlueprint,
  DAY_BLUEPRINT_KIND_LABELS,
  describeDayBlueprint,
  insertRoundInBlueprint,
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
import { WEEK_DAY_ABBRS } from "@/lib/weekWizardConstants";
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
  const [pendingCopySourceDow, setPendingCopySourceDow] = useState<
    number | null
  >(null);

  useEffect(() => {
    setPendingCopySourceDow(null);
  }, [dayOfWeek]);

  return (
    <div className="flex flex-col gap-4">
      {dayWarnings.length > 0 ? (
        <ul className="flex flex-col gap-1">
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

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted">Copy from another day</p>
        <div className="flex flex-wrap gap-1.5">
          {WEEK_DAY_ABBRS.map((label, sourceDow) => {
            if (sourceDow === dayOfWeek) return null;
            const isPending = pendingCopySourceDow === sourceDow;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={isPending}
                onClick={() => setPendingCopySourceDow(sourceDow)}
                className={uiChoicePillClass(isPending)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {pendingCopySourceDow != null ? (
          <SurfaceCard className="flex flex-col border-amber-500/40 bg-amber-500/10 p-3 gap-2.5">
            <p className="text-sm text-foreground leading-snug">
              Copy {WEEK_DAY_ABBRS[pendingCopySourceDow]}&apos;s plan onto{" "}
              {WEEK_DAY_ABBRS[dayOfWeek]}? This replaces{" "}
              {WEEK_DAY_ABBRS[dayOfWeek]}&apos;s current plan.
            </p>
            <p className="text-xs text-muted leading-snug">
              {describeDayBlueprint(
                blueprint[pendingCopySourceDow] ?? {
                  dayKind: "full_rest",
                  rounds: [],
                },
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange((prev) =>
                    copyDayInBlueprint(prev, dayOfWeek, pendingCopySourceDow),
                  );
                  setPendingCopySourceDow(null);
                }}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90"
              >
                Copy plan
              </button>
              <button
                type="button"
                onClick={() => setPendingCopySourceDow(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </SurfaceCard>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted">Day type</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {DAY_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={day.dayKind === kind}
              onClick={() =>
                onChange((prev) => setDayKindInBlueprint(prev, dayOfWeek, kind))
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
          <div className="flex flex-col gap-3">
            {day.rounds.map((round, roundIndex) => (
              <SurfaceCard
                key={roundIndex}
                className="flex flex-col p-3 gap-2 bg-surface-hover/30"
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
                          removeRoundInBlueprint(prev, dayOfWeek, roundIndex),
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

                <div className="flex flex-col gap-1.5 py-1">
                  <label
                    htmlFor={`round-${dayOfWeek}-${roundIndex}-count`}
                    className="block text-xs font-medium text-foreground"
                  >
                    Exercises in this round
                  </label>
                  <p className="text-[11px] text-muted leading-snug">
                    Optional - leave blank for ~{defaultExerciseCount}{" "}
                    exercises, or enter any count (minimum 1).
                  </p>
                  <input
                    id={`round-${dayOfWeek}-${roundIndex}-count`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={round.exerciseCount ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      onChange((prev) =>
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
                  <div className="flex flex-wrap gap-2 py-1">
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

                {canAddRound ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) =>
                        insertRoundInBlueprint(prev, dayOfWeek, roundIndex + 1),
                      )
                    }
                    className="w-full rounded-lg border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted hover:border-accent/40 hover:text-foreground"
                  >
                    + Add round below
                  </button>
                ) : null}
              </SurfaceCard>
            ))}

            {!canAddRound ? (
              <p className="text-xs text-muted text-center">
                Maximum {MAX_BLUEPRINT_ROUNDS} rounds per day.
              </p>
            ) : null}
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
    </div>
  );
}
