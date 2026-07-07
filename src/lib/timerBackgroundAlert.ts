"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { TimerMode } from "@/stores/useFloatingTimerStore";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { playTimerDoneAlert } from "@/utils/timerAlert";

const TIMER_NOTIFICATION_ID = 9001;
const TIMER_CHANNEL_ID = "timer_alerts";

let notifiedEndsAtMs: number | null = null;
let scheduledEndsAtMs: number | null = null;
let notificationDeliveredForEndsAtMs: number | null = null;
let channelReady = false;
let listenersRegistered = false;

function timerNotificationCopy(mode: TimerMode): {
  title: string;
  body: string;
} {
  if (mode === "setTimer") {
    return {
      title: "Set complete",
      body: "Your set timer is done.",
    };
  }
  return {
    title: "Rest complete",
    body: "Time for your next set.",
  };
}

function shouldScheduleBackgroundAlert(): boolean {
  const { timerSoundsEnabled, timerVibrationEnabled } =
    useSettingsStore.getState();
  return timerSoundsEnabled || timerVibrationEnabled;
}

function canUseLocalNotifications(): boolean {
  return (
    isNativePlatform() && Capacitor.isPluginAvailable("LocalNotifications")
  );
}

async function ensureTimerNotificationChannel(): Promise<void> {
  if (!canUseLocalNotifications() || channelReady) return;
  const { timerSoundsEnabled, timerVibrationEnabled } =
    useSettingsStore.getState();
  await LocalNotifications.createChannel({
    id: TIMER_CHANNEL_ID,
    name: "Timer alerts",
    description: "Rest and set timer completion alerts",
    importance: 5,
    visibility: 1,
    vibration: timerVibrationEnabled,
    sound: timerSoundsEnabled ? "default" : undefined,
  });
  channelReady = true;
}

async function ensureTimerNotificationPermissions(): Promise<boolean> {
  if (!canUseLocalNotifications()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

export function resetTimerCompletionTracking(): void {
  notifiedEndsAtMs = null;
  scheduledEndsAtMs = null;
  notificationDeliveredForEndsAtMs = null;
}

export async function cancelTimerBackgroundNotification(): Promise<void> {
  if (!canUseLocalNotifications()) return;
  scheduledEndsAtMs = null;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: TIMER_NOTIFICATION_ID }],
    });
  } catch {
    /* native plugin unavailable or cancel failed */
  }
}

export async function syncTimerBackgroundNotification(options: {
  mode: TimerMode;
  running: boolean;
  countdownEndsAtMs: number | null;
}): Promise<void> {
  if (!canUseLocalNotifications()) return;

  const isCountdown =
    options.mode === "rest" || options.mode === "setTimer";
  const endsAt = options.countdownEndsAtMs;

  if (
    !options.running ||
    !isCountdown ||
    endsAt == null ||
    endsAt <= Date.now() ||
    !shouldScheduleBackgroundAlert()
  ) {
    await cancelTimerBackgroundNotification();
    return;
  }

  if (scheduledEndsAtMs === endsAt) return;

  const permitted = await ensureTimerNotificationPermissions();
  if (!permitted) {
    scheduledEndsAtMs = null;
    return;
  }

  try {
    await ensureTimerNotificationChannel();
    await LocalNotifications.cancel({
      notifications: [{ id: TIMER_NOTIFICATION_ID }],
    });

    const copy = timerNotificationCopy(options.mode);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TIMER_NOTIFICATION_ID,
          title: copy.title,
          body: copy.body,
          channelId: TIMER_CHANNEL_ID,
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
          extra: { endsAtMs: String(endsAt) },
        },
      ],
    });
    scheduledEndsAtMs = endsAt;
  } catch {
    scheduledEndsAtMs = null;
  }
}

export function completeTimerCountdown(endsAtMs: number | null): void {
  if (endsAtMs != null) {
    if (notifiedEndsAtMs === endsAtMs) {
      void cancelTimerBackgroundNotification();
      return;
    }

    const deliveredWhileBackground =
      notificationDeliveredForEndsAtMs === endsAtMs;
    const likelyNotifiedInBackground =
      deliveredWhileBackground ||
      (scheduledEndsAtMs === endsAtMs &&
        Date.now() - endsAtMs > 1500);

    if (likelyNotifiedInBackground) {
      notifiedEndsAtMs = endsAtMs;
      void cancelTimerBackgroundNotification();
      return;
    }

    notifiedEndsAtMs = endsAtMs;
  }

  void cancelTimerBackgroundNotification();
  playTimerDoneAlert();
}

export function markTimerNotificationDelivered(endsAtMs: number): void {
  notificationDeliveredForEndsAtMs = endsAtMs;
  notifiedEndsAtMs = endsAtMs;
  scheduledEndsAtMs = null;
}

function parseEndsAtMs(extra: Record<string, unknown> | undefined): number | null {
  const raw = extra?.endsAtMs;
  if (typeof raw === "string" || typeof raw === "number") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function registerTimerBackgroundAlertListeners(): Promise<
  () => void
> {
  if (!canUseLocalNotifications() || listenersRegistered) {
    return () => {};
  }

  try {
    const received = await LocalNotifications.addListener(
      "localNotificationReceived",
      (notification) => {
        if (notification.id !== TIMER_NOTIFICATION_ID) return;
        const endsAtMs = parseEndsAtMs(notification.extra);
        if (endsAtMs != null) {
          markTimerNotificationDelivered(endsAtMs);
        }
        playTimerDoneAlert();
      },
    );
    const performed = await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => {
        if (action.notification.id !== TIMER_NOTIFICATION_ID) return;
        const endsAtMs = parseEndsAtMs(action.notification.extra);
        if (endsAtMs != null) {
          markTimerNotificationDelivered(endsAtMs);
        }
      },
    );

    listenersRegistered = true;
    return () => {
      void received.remove();
      void performed.remove();
      listenersRegistered = false;
    };
  } catch {
    return () => {};
  }
}
