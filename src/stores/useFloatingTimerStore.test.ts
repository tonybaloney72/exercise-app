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
      countdownRemainingMs: 0,
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
    expect(s.countdownRemainingMs).toBe(0);
    expect(s.running).toBe(false);
  });

  it("updates countdownRemainingMs between second ticks", () => {
    useFloatingTimerStore.getState().startRest(10, true);
    vi.advanceTimersByTime(500);
    useFloatingTimerStore.getState().syncTimerClock();
    const s = useFloatingTimerStore.getState();
    expect(s.seconds).toBe(10);
    expect(s.countdownRemainingMs).toBeGreaterThan(9_000);
    expect(s.countdownRemainingMs).toBeLessThanOrEqual(10_000);
  });

  it("shows 1 second on display while sub-second time remains", () => {
    useFloatingTimerStore.getState().startRest(5, true);
    vi.advanceTimersByTime(4_500);
    useFloatingTimerStore.getState().syncTimerClock();
    const s = useFloatingTimerStore.getState();
    expect(s.seconds).toBe(1);
    expect(s.countdownRemainingMs).toBeLessThanOrEqual(500);
    expect(s.countdownRemainingMs).toBeGreaterThan(0);
  });

  it("advances stopwatch from wall-clock segment start", () => {
    useFloatingTimerStore.getState().startStopwatch(true);
    vi.advanceTimersByTime(5000);
    useFloatingTimerStore.getState().syncTimerClock();
    expect(useFloatingTimerStore.getState().seconds).toBe(5);
  });

  it("resume at zero restarts countdown from full duration", () => {
    useFloatingTimerStore.getState().startRest(90, true);
    vi.advanceTimersByTime(90_000);
    useFloatingTimerStore.getState().syncTimerClock();
    expect(useFloatingTimerStore.getState().seconds).toBe(0);
    expect(useFloatingTimerStore.getState().running).toBe(false);

    useFloatingTimerStore.getState().resume();
    const s = useFloatingTimerStore.getState();
    expect(s.seconds).toBe(90);
    expect(s.running).toBe(true);
    expect(s.countdownEndsAtMs).not.toBeNull();
  });
});
