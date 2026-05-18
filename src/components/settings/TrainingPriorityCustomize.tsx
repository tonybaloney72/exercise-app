"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  describeTrainingPriorityScores,
  EMPHASIS_GROUP_LABELS,
  EMPHASIS_GROUP_ORDER,
  EMPHASIS_SCORE_LABELS,
  scoresFromPreset,
  type EmphasisGroup,
  type TrainingPriorityScore,
  type TrainingPriorityScores,
} from "@/lib/trainingPriorities";
import type { TrainingPriorityPreset } from "@/types";

type Props = {
  scores: TrainingPriorityScores;
  customized: boolean;
  activePreset: TrainingPriorityPreset;
  onPresetSelect: (preset: TrainingPriorityPreset) => void;
  onScoresChange: (scores: TrainingPriorityScores, customized: boolean) => void;
};

export default function TrainingPriorityCustomize({
  scores,
  customized,
  activePreset,
  onPresetSelect,
  onScoresChange,
}: Props) {
  const [open, setOpen] = useState(customized);

  function setGroupScore(group: EmphasisGroup, value: TrainingPriorityScore) {
    const next = { ...scores, [group]: value };
    onScoresChange(next, true);
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-foreground">
          Customize priorities
        </span>
        <span className="text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Emphasis from Skip (0) to Peak (4). Presets fill these scores; edits
            apply when your week is generated.
          </p>

          <p className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs leading-relaxed text-foreground">
            {describeTrainingPriorityScores(scores)}
          </p>

          <motion.div className="space-y-3" layout>
            {EMPHASIS_GROUP_ORDER.map((group) => (
              <div key={group} className="space-y-1.5">
                <motion.div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {EMPHASIS_GROUP_LABELS[group]}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted">
                    {scores[group]}
                  </span>
                </motion.div>
                <div
                  className="flex gap-1"
                  role="radiogroup"
                  aria-label={`${EMPHASIS_GROUP_LABELS[group]} emphasis`}
                >
                  {EMPHASIS_SCORE_LABELS.map((label, value) => {
                    const score = value as TrainingPriorityScore;
                    const selected = scores[group] === score;
                    return (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setGroupScore(group, score)}
                        className={`flex-1 rounded-lg border px-1 py-1.5 text-[10px] font-medium transition-colors ${
                          selected
                            ? "border-accent bg-accent/15 text-accent"
                            : "border-border bg-surface-hover text-muted hover:border-accent/30"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>

          {customized && (
            <button
              type="button"
              onClick={() => {
                onPresetSelect(activePreset);
                onScoresChange(scoresFromPreset(activePreset), false);
              }}
              className="text-xs font-medium text-accent hover:underline"
            >
              Reset scores to current preset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
