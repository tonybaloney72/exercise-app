const DISMISS_KEY_PREFIX = "rep-increase-dismissed:";

export function dismissRepIncreaseForWorkout(workoutId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${workoutId}`, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isRepIncreaseDismissedForWorkout(workoutId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(`${DISMISS_KEY_PREFIX}${workoutId}`) === "1";
  } catch {
    return false;
  }
}
