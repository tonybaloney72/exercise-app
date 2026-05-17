import { useSettingsStore } from "@/stores/useSettingsStore";

/** Short pulse when marking an exercise or stretch complete (uses timer vibration setting). */
export function vibrateOnExerciseComplete(): void {
  const { timerVibrationEnabled } = useSettingsStore.getState();
  if (!timerVibrationEnabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(40);
  }
}
