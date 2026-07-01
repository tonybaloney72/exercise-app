export type CardioActivityTimerState = {
  startedAtMs: number | null;
  accumulatedActiveMs: number;
  segmentStartedAtMs: number | null;
  paused: boolean;
};

export function initialCardioActivityTimerState(): CardioActivityTimerState {
  return {
    startedAtMs: null,
    accumulatedActiveMs: 0,
    segmentStartedAtMs: null,
    paused: false,
  };
}

export function startCardioActivityTimer(
  now = Date.now(),
): CardioActivityTimerState {
  return {
    startedAtMs: now,
    accumulatedActiveMs: 0,
    segmentStartedAtMs: now,
    paused: false,
  };
}

export function pauseCardioActivityTimer(
  state: CardioActivityTimerState,
  now = Date.now(),
): CardioActivityTimerState {
  if (state.paused || state.segmentStartedAtMs == null) return state;
  return {
    ...state,
    accumulatedActiveMs:
      state.accumulatedActiveMs + (now - state.segmentStartedAtMs),
    segmentStartedAtMs: null,
    paused: true,
  };
}

export function resumeCardioActivityTimer(
  state: CardioActivityTimerState,
  now = Date.now(),
): CardioActivityTimerState {
  if (!state.paused) return state;
  return {
    ...state,
    segmentStartedAtMs: now,
    paused: false,
  };
}

export function resetCardioActivityTimer(): CardioActivityTimerState {
  return initialCardioActivityTimerState();
}

export function cardioActivityActiveSeconds(
  state: CardioActivityTimerState,
  now = Date.now(),
): number {
  if (state.startedAtMs == null) return 0;
  return Math.max(1, Math.round(cardioActivityActiveMs(state, now) / 1000));
}

function cardioActivityActiveMs(
  state: CardioActivityTimerState,
  now = Date.now(),
): number {
  const segment =
    state.paused || state.segmentStartedAtMs == null
      ? 0
      : now - state.segmentStartedAtMs;
  return state.accumulatedActiveMs + segment;
}

export function isCardioActivityRecording(
  state: CardioActivityTimerState,
): boolean {
  return state.startedAtMs != null;
}
