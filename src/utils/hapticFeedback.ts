import { isNativePlatform } from "@/lib/capacitorRuntime";
import { useSettingsStore } from "@/stores/useSettingsStore";

/** Timer finished - long triple pulse (duration is the main lever on mobile). */
const TIMER_DONE_PATTERN_MS = [400, 120, 400, 120, 400] as const;

/** Exercise / stretch marked complete - shorter but stronger than before. */
const EXERCISE_COMPLETE_PATTERN_MS = [120, 80, 200] as const;

function vibrateWithNavigator(pattern: readonly number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate([...pattern]);
  } catch {
    /* ignore unsupported / blocked */
  }
}

function vibrateWithCapacitor(pattern: readonly number[]): void {
  void (async () => {
    try {
      const { Haptics } = await import("@capacitor/haptics");
      let delay = 0;
      for (let i = 0; i < pattern.length; i++) {
        const ms = pattern[i]!;
        if (i % 2 === 0) {
          setTimeout(() => {
            void Haptics.vibrate({ duration: ms }).catch(() => {});
          }, delay);
        }
        delay += ms;
      }
    } catch {
      vibrateWithNavigator(pattern);
    }
  })();
}

function vibratePattern(pattern: readonly number[]): void {
  if (isNativePlatform()) {
    vibrateWithCapacitor(pattern);
    return;
  }
  vibrateWithNavigator(pattern);
}

export function vibrateTimerDone(): void {
  const { timerVibrationEnabled } = useSettingsStore.getState();
  if (!timerVibrationEnabled) return;
  vibratePattern(TIMER_DONE_PATTERN_MS);
}

/** Short pulse when marking an exercise or stretch complete (uses timer vibration setting). */
export function vibrateOnExerciseComplete(): void {
  const { timerVibrationEnabled } = useSettingsStore.getState();
  if (!timerVibrationEnabled) return;
  vibratePattern(EXERCISE_COMPLETE_PATTERN_MS);
}
