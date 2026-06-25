import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/stores/useSettingsStore";

const beginTimerAudioDuck = vi.fn().mockResolvedValue(true);
const endTimerAudioDuck = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/capacitorRuntime", () => ({
  isNativePlatform: vi.fn(() => true),
}));

vi.mock("@/lib/audio/timerAudioDuck", () => ({
  beginTimerAudioDuck,
  endTimerAudioDuck,
}));

vi.mock("@/utils/hapticFeedback", () => ({
  vibrateTimerDone: vi.fn(),
}));

class MockAudioContext {
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator() {
    return {
      type: "sine",
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
}

describe("playTimerDoneAlert", () => {
  beforeEach(() => {
    beginTimerAudioDuck.mockClear();
    endTimerAudioDuck.mockClear();
    useSettingsStore.setState({ timerSoundsEnabled: true });
    vi.stubGlobal("AudioContext", MockAudioContext);
  });

  it("requests transient audio ducking around the timer chime on native", async () => {
    vi.useFakeTimers();
    const { playTimerDoneAlert } = await import("@/utils/timerAlert");
    playTimerDoneAlert();

    await vi.waitFor(() => {
      expect(beginTimerAudioDuck).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(450);

    await vi.waitFor(() => {
      expect(endTimerAudioDuck).toHaveBeenCalledTimes(1);
    });
    expect(endTimerAudioDuck.mock.invocationCallOrder[0]).toBeGreaterThan(
      beginTimerAudioDuck.mock.invocationCallOrder[0],
    );
    vi.useRealTimers();
  });

  it("skips ducking when timer sounds are disabled", async () => {
    useSettingsStore.setState({ timerSoundsEnabled: false });
    const { playTimerDoneAlert } = await import("@/utils/timerAlert");
    playTimerDoneAlert();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(beginTimerAudioDuck).not.toHaveBeenCalled();
    expect(endTimerAudioDuck).not.toHaveBeenCalled();
  });
});
