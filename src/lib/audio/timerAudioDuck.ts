import { registerPlugin } from "@capacitor/core";
import { isNativePlatform } from "@/lib/capacitorRuntime";

type TimerAudioFocusPlugin = {
  beginDuck(): Promise<{ granted: boolean }>;
  endDuck(): Promise<void>;
};

const TimerAudioFocus = registerPlugin<TimerAudioFocusPlugin>("TimerAudioFocus");

export async function beginTimerAudioDuck(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { granted } = await TimerAudioFocus.beginDuck();
    return granted;
  } catch {
    return false;
  }
}

export async function endTimerAudioDuck(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await TimerAudioFocus.endDuck();
  } catch {
    // Best-effort release so music volume restores.
  }
}
