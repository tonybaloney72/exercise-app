/** Elapsed seconds from planned total minus time still showing on the dial. */
export function elapsedFromSetTimer(
  restTotalSeconds: number,
  secondsLeft: number,
): number {
  return Math.max(
    0,
    Math.floor(restTotalSeconds) - Math.max(0, Math.floor(secondsLeft)),
  );
}

/**
 * After +/− time on a running countdown, keep planned total = elapsed + remaining
 * so stop/complete logs wall time worked (not original target − remaining).
 */
export function adjustCountdownPlan(
  restTotalSeconds: number,
  secondsLeft: number,
  deltaSeconds: number,
): { restTotalSeconds: number; secondsLeft: number } {
  const elapsed = elapsedFromSetTimer(restTotalSeconds, secondsLeft);
  const nextLeft = Math.max(0, Math.floor(secondsLeft) + deltaSeconds);
  return {
    secondsLeft: nextLeft,
    restTotalSeconds: elapsed + nextLeft,
  };
}
