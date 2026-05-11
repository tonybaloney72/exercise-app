"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import RoundCard from "./RoundCard";
import Checkbox from "@/components/common/Checkbox";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { parseTimeInput, formatSecondsToMMSS } from "@/utils/time";
import type { DayPlan } from "@/types";

interface WorkoutSessionProps {
  plan: DayPlan;
}

export default function WorkoutSession({ plan }: WorkoutSessionProps) {
  const {
    activeWorkout,
    toggleJog,
    setJogDistance,
    setJogDurationSeconds,
    toggleWarmUp,
    toggleCoolDown,
    setWorkoutNotes,
    completeWorkout,
    discardWorkout,
  } = useWorkoutStore();

  const [distanceInput, setDistanceInput] = useState("");
  const [durationInput, setDurationInput] = useState("");

  if (!activeWorkout) return null;

  const totalExercises = activeWorkout.rounds.reduce(
    (acc, r) => acc + r.exercises.length,
    0
  );
  const completedExercises = activeWorkout.rounds.reduce(
    (acc, r) => acc + r.exercises.filter((e) => e.completed || e.skipped).length,
    0
  );
  const overallProgress =
    totalExercises > 0 ? completedExercises / totalExercises : 0;

  const handleComplete = () => {
    completeWorkout();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Overall progress */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted">Workout Progress</span>
          <span className="text-xs font-bold text-accent">
            {Math.round(overallProgress * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-purple-500"
            animate={{ width: `${overallProgress * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Warm-up */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <Checkbox
          checked={activeWorkout.warmUpCompleted}
          onChange={toggleWarmUp}
          label="Warm-up Stretches"
          sublabel="5–10 minutes"
        />
      </div>

      {/* Jog section */}
      {plan.hasJog && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <Checkbox
            checked={activeWorkout.jogCompleted}
            onChange={toggleJog}
            label="Jog"
            sublabel="1.1–1.5+ miles"
          />
          {activeWorkout.jogCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="border-t border-border px-4 py-3 flex gap-3"
            >
              <div className="flex-1">
                <label className="text-[10px] text-muted uppercase tracking-wider">Miles</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={distanceInput || (activeWorkout.jogDistance != null ? String(activeWorkout.jogDistance) : "")}
                  onChange={(e) => setDistanceInput(e.target.value)}
                  onBlur={() => {
                    const val = distanceInput.trim();
                    if (val === "") {
                      setJogDistance(undefined);
                    } else {
                      const num = parseFloat(val);
                      setJogDistance(isNaN(num) ? undefined : num);
                    }
                    setDistanceInput("");
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  placeholder="1.3"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted uppercase tracking-wider">Time (MM:SS)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={durationInput || formatSecondsToMMSS(activeWorkout.jogDurationSeconds)}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseTimeInput(durationInput);
                    setJogDurationSeconds(parsed);
                    setDurationInput("");
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  placeholder="17:35"
                />
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Rounds */}
      {plan.rounds.map((round, i) => (
        <RoundCard
          key={round.roundNumber}
          round={round}
          roundLog={activeWorkout.rounds[i]}
          isLast={i === plan.rounds.length - 1}
        />
      ))}

      {/* Cool-down */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <Checkbox
          checked={activeWorkout.coolDownCompleted}
          onChange={toggleCoolDown}
          label="Cool-down Stretches"
          sublabel="5–10 minutes"
        />
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <label className="text-xs font-medium text-muted">Notes (optional)</label>
        <textarea
          rows={2}
          value={activeWorkout.notes ?? ""}
          onChange={(e) => setWorkoutNotes(e.target.value)}
          placeholder="How did it feel today?"
          className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={discardWorkout}
          className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground hover:border-foreground/20"
        >
          Discard
        </button>
        <button
          onClick={handleComplete}
          className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 active:bg-accent/80"
        >
          Complete Workout
        </button>
      </div>
    </div>
  );
}
