"use client";

import {
  describeExpertiseByGroup,
  EXPERTISE_LEVEL_LABELS,
  EXPERTISE_LEVEL_ORDER,
} from "@/lib/expertiseLevels";
import {
  EMPHASIS_GROUP_LABELS,
  EMPHASIS_GROUP_ORDER,
  type EmphasisGroup,
} from "@/lib/trainingPriorities";
import type { ExpertiseByGroup, ExpertiseLevel } from "@/types";

type Props = {
  byGroup: ExpertiseByGroup;
  onChange: (byGroup: ExpertiseByGroup) => void;
};

export default function ExpertiseByGroupEditor({ byGroup, onChange }: Props) {
  function setGroupLevel(group: EmphasisGroup, level: ExpertiseLevel) {
    onChange({ ...byGroup, [group]: level });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted leading-relaxed">
        Plans and swaps only use exercises at or below each group&apos;s level.
        Turn off &ldquo;Avoid easy regressions&rdquo; above to allow easier
        steps in a progression (e.g. incline push-ups) regardless of cap.
      </p>

      <div className="space-y-3">
        {EMPHASIS_GROUP_ORDER.map((group) => (
          <div key={group} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {EMPHASIS_GROUP_LABELS[group]}
              </span>
            </div>
            <div
              className="flex flex-wrap gap-1"
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
                    className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors ${
                      selected
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:border-accent/30"
                    }`}
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
