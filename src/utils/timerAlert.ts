/**
 * Short chime + vibration when an inline set timer finishes.
 * Call `primeTimerAudio()` from the same user gesture that starts the timer
 * so mobile browsers are more likely to allow sound when it fires later.
 */

import {
  beginTimerAudioDuck,
  endTimerAudioDuck,
} from "@/lib/audio/timerAudioDuck";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { vibrateTimerDone } from "@/utils/hapticFeedback";

/** Peak gain for timer chime (Web Audio; ~0.12 was hard to hear on phone speakers). */
const TIMER_CHIME_PEAK_GAIN = 0.38;

/** Let music duck before the chime so the alert sits on a quieter bed. */
const TIMER_CHIME_PRE_DUCK_MS = 200;

/** Two-tone pattern length (second tone ends ~this many ms after the first starts). */
const TIMER_CHIME_PLAYBACK_MS = 450;

/** Hold duck briefly after the chime so music does not rush back over the tail. */
const TIMER_CHIME_POST_DUCK_MS = 200;

export const TIMER_ALERT_DUCK_HOLD_MS =
  TIMER_CHIME_PRE_DUCK_MS + TIMER_CHIME_PLAYBACK_MS + TIMER_CHIME_POST_DUCK_MS;

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AC) return null;
    if (!sharedCtx) sharedCtx = new AC();
    return sharedCtx;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run on the tap that starts a countdown (unlocks audio on many mobile browsers). */
export function primeTimerAudio(): void {
  const ctx = getAudioContext();
  if (ctx) void ctx.resume().catch(() => {});
}

function beep(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.001, startAt);
  gain.gain.exponentialRampToValueAtTime(
    TIMER_CHIME_PEAK_GAIN,
    startAt + 0.012,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

function scheduleTimerDoneChime(ctx: AudioContext): void {
  const t = ctx.currentTime;
  beep(ctx, 880, t, 0.14);
  beep(ctx, 1174, t + 0.2, 0.18);
}

async function playTimerDoneChime(): Promise<void> {
  const { timerSoundsEnabled } = useSettingsStore.getState();
  if (!timerSoundsEnabled) return;

  const shouldDuck = isNativePlatform();
  let ducked = false;
  if (shouldDuck) {
    ducked = await beginTimerAudioDuck();
  }

  try {
    if (ducked) {
      await delay(TIMER_CHIME_PRE_DUCK_MS);
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    await ctx.resume();
    scheduleTimerDoneChime(ctx);

    if (ducked) {
      await delay(TIMER_CHIME_PLAYBACK_MS + TIMER_CHIME_POST_DUCK_MS);
    }
  } catch {
    // Ignore audio playback errors.
  } finally {
    if (ducked) {
      await endTimerAudioDuck();
    }
  }
}

export function playTimerDoneAlert(): void {
  vibrateTimerDone();
  void playTimerDoneChime();
}
