"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DIAGNOSTIC_UNLOCK_LONG_PRESS_MS,
  readDiagnosticLogUnlocked,
  registerDiagnosticUnlockTap,
  writeDiagnosticLogUnlocked,
} from "@/lib/diagnostics/diagnosticLogUnlock";

export function useDiagnosticLogUnlock() {
  const [unlocked, setUnlocked] = useState(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivatedRef = useRef(false);

  useEffect(() => {
    setUnlocked(readDiagnosticLogUnlocked());
  }, []);

  const toggleUnlocked = useCallback((next: boolean) => {
    setUnlocked(next);
    writeDiagnosticLogUnlocked(next);
    toast.message(
      next ? "Diagnostic log enabled" : "Diagnostic log hidden",
    );
  }, []);

  const onUnlockHeaderTap = useCallback(() => {
    if (longPressActivatedRef.current) {
      longPressActivatedRef.current = false;
      return;
    }
    const { timestamps, triggered } = registerDiagnosticUnlockTap(
      tapTimestampsRef.current,
    );
    tapTimestampsRef.current = timestamps;
    if (triggered) {
      tapTimestampsRef.current = [];
      toggleUnlocked(!unlocked);
    }
  }, [toggleUnlocked, unlocked]);

  const onUnlockHeaderPressStart = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressActivatedRef.current = true;
      tapTimestampsRef.current = [];
      toggleUnlocked(!unlocked);
    }, DIAGNOSTIC_UNLOCK_LONG_PRESS_MS);
  }, [toggleUnlocked, unlocked]);

  const onUnlockHeaderPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    unlocked,
    onUnlockHeaderTap,
    onUnlockHeaderPressStart,
    onUnlockHeaderPressEnd,
  };
}
