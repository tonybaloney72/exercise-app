"use client";

import { useSettingsStore } from "@/stores/useSettingsStore";

export default function AppearanceSettingsSection() {
  const settings = useSettingsStore();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">Dark mode</p>
        <p className="text-xs text-muted mt-0.5">
          Turn off for a light background across the app
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={settings.darkMode}
        onClick={() => settings.updateSettings({ darkMode: !settings.darkMode })}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          settings.darkMode ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            settings.darkMode ? "translate-x-6" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{settings.darkMode ? "On" : "Off"}</span>
      </button>
    </div>
  );
}
