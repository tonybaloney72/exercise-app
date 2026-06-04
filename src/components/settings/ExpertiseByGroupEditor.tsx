"use client";

import {
  EXPERTISE_LEVEL_LABELS,
  EXPERTISE_LEVEL_ORDER,
} from "@/lib/expertiseLevels";
import {
  EMPHASIS_GROUP_LABELS,
  EMPHASIS_GROUP_ORDER,
  type EmphasisGroup,
} from "@/lib/trainingPriorities";
import { uiChoicePillClass } from "@/lib/uiClasses";
import type { ExpertiseByGroup, ExpertiseLevel } from "@/types";

type Props = {
  byGroup: ExpertiseByGroup;
  onChange: (byGroup: ExpertiseByGroup) => void;
  /** Shorter copy for onboarding (no settings-only hints). */
  variant?: "settings" | "onboarding";
};

export default function ExpertiseByGroupEditor({
  byGroup,
  onChange,
  variant = "settings",
}: Props) {
  function setGroupLevel(group: EmphasisGroup, level: ExpertiseLevel) {
    onChange({ ...byGroup, [group]: level });
  }

  return (
    <div className="space-y-3">
      {variant === "settings" ? (
        <p className="text-sm text-muted leading-relaxed">
          Plans and swaps only use exercises at or below each group&apos;s
          level. Turn off &ldquo;Avoid easy regressions&rdquo; above to allow
          easier steps in a progression (e.g. incline push-ups) regardless of
          cap.
        </p>
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          We&apos;ll match plans and swaps to exercises at or below each
          group&apos;s level. You can change these anytime in Settings.
        </p>
      )}

      <div className="space-y-3">
        {EMPHASIS_GROUP_ORDER.map((group) => (
          <div key={group} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {EMPHASIS_GROUP_LABELS[group]}
              </span>
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="radiogroup"
              aria-label={`${EMPHASIS_GROUP_LABELS[group]} skill level`}
            >
              {EXPERTISE_LEVEL_ORDER.map((level) => {
                const selected = byGroup[group] === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGroupLevel(group, level)}
                    className={uiChoicePillClass(selected)}
                  >
                    {EXPERTISE_LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
