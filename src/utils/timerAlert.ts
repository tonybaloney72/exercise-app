/**
 * Short chime + vibration when an inline set timer finishes.
 * Call `primeTimerAudio()` from the same user gesture that starts the timer
 * so mobile browsers are more likely to allow sound when it fires later.
 */

import { useSettingsStore } from "@/stores/useSettingsStore";
import { vibrateTimerDone } from "@/utils/hapticFeedback";

/** Peak gain for timer chime (Web Audio; ~0.12 was hard to hear on phone speakers). */
const TIMER_CHIME_PEAK_GAIN = 0.38;

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
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    startAt + durationSec,
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function playTimerDoneChime(): void {
  const { timerSoundsEnabled } = useSettingsStore.getState();
  if (!timerSoundsEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    const t = ctx.currentTime;
    beep(ctx, 880, t, 0.14);
    beep(ctx, 1174, t + 0.2, 0.18);
  }).catch(() => {});
}

export function playTimerDoneAlert(): void {
  vibrateTimerDone();
  playTimerDoneChime();
}
