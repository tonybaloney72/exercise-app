import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";

vi.mock("@/utils/timerAlert", () => ({
  primeTimerAudio: vi.fn(),
  playTimerDoneAlert: vi.fn(),
}));

describe("useFloatingTimerStore syncTimerClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFloatingTimerStore.setState({
      mode: "idle",
      presentation: "fullscreen",
      running: false,
      seconds: 0,
      restTotalSeconds: 0,
      lastStopwatchSeconds: null,
      countdownEndsAtMs: null,
      stopwatchStartedAtMs: null,
      stopwatchBaseSeconds: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down from wall-clock deadline after background delay", () => {
    useFloatingTimerStore.getState().startRest(10, true);
    vi.advanceTimersByTime(4000);
    useFloatingTimerStore.getState().syncTimerClock();
    expect(useFloatingTimerStore.getState().seconds).toBe(6);
  });

  it("finishes countdown when deadline passes while throttled", () => {
    useFloatingTimerStore.getState().startRest(3, true);
    vi.advanceTimersByTime(3500);
    useFloatingTimerStore.getState().syncTimerClock();
    const s = useFloatingTimerStore.getState();
    expect(s.seconds).toBe(0);
    expect(s.running).toBe(false);
  });

  it("advances stopwatch from wall-clock segment start", () => {
    useFloatingTimerStore.getState().startStopwatch(true);
    vi.advanceTimersByTime(5000);
    useFloatingTimerStore.getState().syncTimerClock();
    expect(useFloatingTimerStore.getState().seconds).toBe(5);
  });
});
