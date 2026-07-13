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
