"use client";

import {
  LAYOUT_DAY_STRUCTURE_MODE_LABELS,
  resolveMixedRoundCount,
  type LayoutDayStructure,
  type LayoutDayStructureMode,
} from "@/lib/weeklyLayoutDayStructure";
import {
  LAYOUT_GROUP_LABELS,
  type LayoutGroup,
} from "@/lib/weeklyCategoryLayout";
import {
  uiCheckLabel,
  uiCheckbox,
  uiChoicePillClass,
  uiLabelRow,
  uiNumberInput,
} from "@/lib/uiClasses";

type Props = {
  enabled: LayoutGroup[];
  structure: LayoutDayStructure;
  catalogRoundCount?: number;
  onChange: (structure: LayoutDayStructure) => void;
};

const MODES: LayoutDayStructureMode[] = ["mixed", "blocks", "repeat"];

export default function LayoutDayStructureControls({
  enabled,
  structure,
  catalogRoundCount = 3,
  onChange,
}: Props) {
  if (enabled.length === 0) return null;

  const showStructureModes = enabled.length >= 2;
  const showPerGroupRounds =
    enabled.length === 1 || structure.mode !== "mixed";
  const showMixedRounds =
    enabled.length >= 2 && structure.mode === "mixed";
  const mixedRounds = resolveMixedRoundCount(structure, catalogRoundCount);

  function setMode(mode: LayoutDayStructureMode) {
    const next: LayoutDayStructure = {
      ...structure,
      mode,
      repeatStrength: mode === "repeat",
    };
    if (mode === "mixed" && next.mixedRoundCount == null) {
      const fromGroups = enabled.reduce(
        (sum, g) => sum + (structure.groupRounds[g] ?? 0),
        0,
      );
      next.mixedRoundCount =
        fromGroups > 0 ? Math.min(6, fromGroups) : catalogRoundCount;
    }
    onChange(next);
  }

  function setGroupRounds(group: LayoutGroup, value: number) {
    onChange({
      ...structure,
      groupRounds: {
        ...structure.groupRounds,
        [group]: Math.max(0, Math.min(6, value)),
      },
    });
  }

  function setMixedRoundCount(value: number) {
    onChange({
      ...structure,
      mixedRoundCount: Math.max(1, Math.min(6, value)),
    });
  }

  return (
    <div className="space-y-2 border-t border-border/60 pt-2 mt-1">
      {showStructureModes ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">Day structure</p>
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Day structure"
          >
            {MODES.map((mode) => {
              const selected = structure.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(mode)}
                  className={uiChoicePillClass(selected)}
                >
                  {LAYOUT_DAY_STRUCTURE_MODE_LABELS[mode].label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {showMixedRounds ? (
        <label className={uiLabelRow}>
          <span className="text-foreground">Total rounds</span>
          <input
            type="number"
            min={1}
            max={6}
            value={mixedRounds}
            onChange={(e) =>
              setMixedRoundCount(Number.parseInt(e.target.value, 10) || 1)
            }
            className={uiNumberInput}
            aria-label="Total rounds for mixed day"
          />
        </label>
      ) : null}

      {showPerGroupRounds ? (
        <div className="space-y-2">
          {enabled.map((group) => (
            <label key={group} className={uiLabelRow}>
              <span className="text-foreground">
                {LAYOUT_GROUP_LABELS[group]} rounds
              </span>
              <input
                type="number"
                min={0}
                max={6}
                value={structure.groupRounds[group] ?? 0}
                onChange={(e) =>
                  setGroupRounds(
                    group,
                    Number.parseInt(e.target.value, 10) || 0,
                  )
                }
                className={uiNumberInput}
              />
            </label>
          ))}

          {structure.mode === "blocks" && enabled.length >= 2 ? (
            <label className={uiCheckLabel}>
              <input
                type="checkbox"
                checked={structure.repeatStrength}
                onChange={(e) =>
                  onChange({
                    ...structure,
                    repeatStrength: e.target.checked,
                  })
                }
                className={uiCheckbox}
              />
              Same exercises each round (per group)
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
