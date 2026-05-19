"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { exerciseMap } from "@/data/exercises";
import { parseTimeInput, formatSecondsToMMSS } from "@/utils/time";
import type { ExerciseLog } from "@/types";

type Props = {
  log: ExerciseLog;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onSetDistance: (mi: number | undefined) => void;
  onSetDurationSeconds: (seconds: number | undefined) => void;
};

export default function CardioSessionBlock({
  log,
  onToggle,
  onSkip,
  onUnskip,
  onSetDistance,
  onSetDurationSeconds,
}: Props) {
  const [open, setOpen] = useState(true);
  const [distanceInput, setDistanceInput] = useState("");
  const [durationInput, setDurationInput] = useState("");

  const meta = exerciseMap[log.exerciseId];
  const title = meta?.name ?? log.exerciseId;
  const done = log.completed || log.skipped;

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {done ? <span className="text-green-400 text-xs">✓</span> : null}
        </span>
        <span className="text-xs text-muted">{done ? 1 : 0}/1</span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.section
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border px-2 py-1"
          >
            <section className={log.skipped ? "opacity-40" : undefined}>
              <span className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={onToggle}
                  aria-pressed={log.completed}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-border"
                  style={
                    log.completed
                      ? {
                          borderColor: "var(--accent)",
                          backgroundColor: "var(--accent)",
                          color: "white",
                        }
                      : undefined
                  }
                >
                  {log.completed ? "✓" : ""}
                </button>
                <span className="flex-1 min-w-0 py-2 block">
                  <p
                    className={`text-sm font-medium ${
                      done ? "text-muted line-through" : "text-foreground"
                    }`}
                  >
                    Session
                  </p>
                  <p className="text-xs text-muted">Distance + time</p>
                </span>
                {!log.completed && !log.skipped ? (
                  <button type="button" onClick={onSkip} className="text-xs text-muted">
                    Skip
                  </button>
                ) : null}
                {log.skipped ? (
                  <button type="button" onClick={onUnskip} className="text-xs text-muted">
                    Undo
                  </button>
                ) : null}
              </span>
              <span className="pl-10 pr-1 pb-3 flex gap-3 block">
                <label className="flex-1 block">
                  <span className="text-[10px] text-muted uppercase tracking-wider">
                    Distance (mi)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      distanceInput ||
                      (log.actualDistanceMi != null ? String(log.actualDistanceMi) : "")
                    }
                    onChange={(e) => setDistanceInput(e.target.value)}
                    onBlur={() => {
                      const val = distanceInput.trim();
                      if (val === "") onSetDistance(undefined);
                      else {
                        const num = parseFloat(val);
                        onSetDistance(Number.isNaN(num) ? undefined : num);
                      }
                      setDistanceInput("");
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="1.3"
                  />
                </label>
                <label className="flex-1 block">
                  <span className="text-[10px] text-muted uppercase tracking-wider">
                    Time (MM:SS)
                  </span>
                  <input
                    type="text"
                    value={durationInput || formatSecondsToMMSS(log.actualDuration)}
                    onChange={(e) => setDurationInput(e.target.value)}
                    onBlur={() => {
                      const raw = durationInput.trim();
                      if (raw === "") {
                        setDurationInput("");
                        return;
                      }
                      onSetDurationSeconds(parseTimeInput(raw));
                      setDurationInput("");
                    }}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="17:35"
                  />
                </label>
              </span>
            </section>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
