/** Serialize workout starts per calendar day so parallel taps cannot create duplicate in-progress logs. */
const startChains = new Map<string, Promise<unknown>>();

export function withWorkoutSessionStartLock<T>(
  dateKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = startChains.get(dateKey) ?? Promise.resolve();
  const run = previous.then(() => fn());
  startChains.set(
    dateKey,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

/** @internal Test helper */
export function resetWorkoutSessionStartLockForTests(): void {
  startChains.clear();
}
