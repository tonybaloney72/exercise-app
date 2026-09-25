"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CLEAR_MS = 1400;

/** Track which round index was just inserted so UI can scroll/animate it. */
export function useFocusInsertedRound(clearMs = DEFAULT_CLEAR_MS) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  /** Remount tokens keyed by 1-based round number after insert. */
  const [remountByRoundNumber, setRemountByRoundNumber] = useState<
    Record<number, number>
  >({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remountSeq = useRef(0);

  const clearFocusTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const focusInsertedAt = useCallback(
    (index: number) => {
      clearFocusTimer();
      const roundNumber = index + 1;
      remountSeq.current += 1;
      const token = remountSeq.current;
      setRemountByRoundNumber((prev) => ({ ...prev, [roundNumber]: token }));
      setFocusIndex(index);
      timerRef.current = setTimeout(() => {
        setFocusIndex(null);
        timerRef.current = null;
      }, clearMs);
    },
    [clearFocusTimer, clearMs],
  );

  useEffect(() => clearFocusTimer, [clearFocusTimer]);

  function remountToken(roundNumber: number): number {
    return remountByRoundNumber[roundNumber] ?? 0;
  }

  return { focusIndex, focusInsertedAt, remountToken };
}
