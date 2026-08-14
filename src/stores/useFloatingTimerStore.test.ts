import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { completeTimerCountdown } from "@/lib/timerBackgroundAlert";

vi.mock("@/utils/timerAlert", () => ({
  primeTimerAudio: vi.fn(),
  playTimerDoneAlert: vi.fn(),
}));

vi.mock("@/lib/timerBackgroundAlert", () => ({
  completeTimerCountdown: vi.fn(),
  resetTimerCompletionTracking: vi.fn(),
  cancelTimerBackgroundNotification: vi.fn(),
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
      hasStarted: false,
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
    expect(completeTimerCountdown).toHaveBeenCalled();
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

  it("tracks hasStarted for manual rest and stopwatch launch", () => {
    useFloatingTimerStore.getState().startRest(60, false);
    expect(useFloatingTimerStore.getState().hasStarted).toBe(false);

    useFloatingTimerStore.getState().resume();
    expect(useFloatingTimerStore.getState().hasStarted).toBe(true);

    useFloatingTimerStore.getState().pause();
    expect(useFloatingTimerStore.getState().hasStarted).toBe(true);

    useFloatingTimerStore.getState().startStopwatch(false);
    expect(useFloatingTimerStore.getState().hasStarted).toBe(false);

    useFloatingTimerStore.getState().resume();
    expect(useFloatingTimerStore.getState().hasStarted).toBe(true);

    useFloatingTimerStore.getState().resetStopwatch();
    expect(useFloatingTimerStore.getState().hasStarted).toBe(false);
  });

  it("extends planned total when adding time near the end of a set timer", () => {
    useFloatingTimerStore.getState().startSetCountdown(30);
    useFloatingTimerStore.setState({ seconds: 2, countdownRemainingMs: 2000 });
    useFloatingTimerStore.getState().adjustRest(15);
    const afterAdd = useFloatingTimerStore.getState();
    expect(afterAdd.seconds).toBe(17);
    expect(afterAdd.restTotalSeconds).toBe(45);

    useFloatingTimerStore.setState({ seconds: 8 });
    const elapsed =
      afterAdd.restTotalSeconds - useFloatingTimerStore.getState().seconds;
    expect(elapsed).toBe(37);
  });
});
