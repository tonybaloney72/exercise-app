"use client";

import SettingsSwitch from "@/components/settings/SettingsSwitch";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function TimersDeviceSettingsSection() {
  const settings = useSettingsStore();

  return (
    <>
      <div>
        <p className="text-xs font-semibold text-foreground">
          Rest between rounds
        </p>
        <p className="text-xs text-muted mt-0.5 mb-2">
          Default countdown length when you start a rest timer.
        </p>
        <div
          className="flex gap-2"
          role="group"
          aria-label="Rest between rounds in seconds"
        >
          {[60, 75, 90, 120].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => settings.updateSettings({ restBetweenRounds: val })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                settings.restBetweenRounds === val
                  ? "bg-accent text-white"
                  : "bg-surface-hover text-muted hover:text-foreground border border-border"
              }`}
            >
              {val}s
            </button>
          ))}
        </div>
      </div>
      <SettingsSwitch
        title="Auto-start rest timer"
        description="When you finish a round, open the rest countdown immediately. Turn off to tap Start rest on the round card instead."
        checked={settings.restTimerAutoStart}
        onChange={() =>
          settings.updateSettings({
            restTimerAutoStart: !settings.restTimerAutoStart,
          })
        }
      />
      <SettingsSwitch
        title="Timer sounds"
        description="Play a short chime when a set timer, rest timer, or similar countdown finishes."
        checked={settings.timerSoundsEnabled}
        onChange={() =>
          settings.updateSettings({
            timerSoundsEnabled: !settings.timerSoundsEnabled,
          })
        }
      />
      <SettingsSwitch
        title="Timer & exercise vibration"
        description="Brief vibration when a timer finishes or you mark an exercise complete (if your device supports it)."
        checked={settings.timerVibrationEnabled}
        onChange={() =>
          settings.updateSettings({
            timerVibrationEnabled: !settings.timerVibrationEnabled,
          })
        }
      />
      <SettingsSwitch
        title="Keep screen on"
        description="Prevent the screen from dimming while this app is open."
        checked={settings.keepScreenAwake}
        onChange={() =>
          settings.updateSettings({
            keepScreenAwake: !settings.keepScreenAwake,
          })
        }
      />
    </>
  );
}
