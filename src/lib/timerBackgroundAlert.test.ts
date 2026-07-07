import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeTimerCountdown,
  markTimerNotificationDelivered,
  resetTimerCompletionTracking,
} from "@/lib/timerBackgroundAlert";
import { playTimerDoneAlert } from "@/utils/timerAlert";

vi.mock("@/lib/capacitorRuntime", () => ({
  isNativePlatform: () => false,
}));

vi.mock("@/utils/timerAlert", () => ({
  playTimerDoneAlert: vi.fn(),
}));

vi.mock("@/stores/useSettingsStore", () => ({
  useSettingsStore: {
    getState: () => ({
      timerSoundsEnabled: true,
      timerVibrationEnabled: true,
    }),
  },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    cancel: vi.fn(),
    schedule: vi.fn(),
    createChannel: vi.fn(),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    requestPermissions: vi.fn(async () => ({ display: "granted" })),
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
  },
}));

describe("completeTimerCountdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTimerCompletionTracking();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T12:00:00.000Z"));
  });

  it("plays the foreground alert once per countdown end", () => {
    const endsAt = Date.now() + 1000;
    completeTimerCountdown(endsAt);
    completeTimerCountdown(endsAt);
    expect(playTimerDoneAlert).toHaveBeenCalledTimes(1);
  });

  it("skips a duplicate alert after a background notification fired", () => {
    const endsAt = Date.now() - 5000;
    markTimerNotificationDelivered(endsAt);
    completeTimerCountdown(endsAt);
    expect(playTimerDoneAlert).not.toHaveBeenCalled();
  });
});
