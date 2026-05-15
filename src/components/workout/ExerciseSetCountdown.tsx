"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatSecondsToMMSS } from "@/utils/time";
import { primeTimerAudio, playTimerDoneAlert } from "@/utils/timerAlert";

type Props = {
  durationSec: number;
  disabled?: boolean;
};

export default function ExerciseSetCountdown({
  durationSec,
  disabled = false,
}: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervalSafe = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearIntervalSafe(), [clearIntervalSafe]);

  const cancel = useCallback(() => {
    clearIntervalSafe();
    setRemaining(null);
  }, [clearIntervalSafe]);

  const start = useCallback(() => {
    primeTimerAudio();
    clearIntervalSafe();
    setRemaining(durationSec);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return r;
        if (r <= 1) {
          if (intervalRef.current != null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          playTimerDoneAlert();
          return null;
        }
        return r - 1;
      });
    }, 1000);
  }, [durationSec, clearIntervalSafe]);

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        Countdown
      </p>
      {remaining === null ? (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="mt-2 w-full rounded-lg border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tap to start · {durationSec}s
        </button>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {formatSecondsToMMSS(remaining) || `${remaining}s`}
          </span>
          <button
            type="button"
            onClick={cancel}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-border/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
