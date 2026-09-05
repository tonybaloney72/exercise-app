"use client";

import SettingsSegmentedControl from "@/components/settings/SettingsSegmentedControl";
import {
  THEME_MODE_LABELS,
  THEME_MODES,
  type ThemeMode,
} from "@/lib/themeMode";

type Props = {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
};

export default function ThemeModeSelector({ value, onChange }: Props) {
  const active = THEME_MODE_LABELS[value];

  return (
    <SettingsSegmentedControl
      value={value}
      onChange={onChange}
      aria-label="Theme"
      description={active.description}
      options={THEME_MODES.map((mode) => ({
        value: mode,
        label: THEME_MODE_LABELS[mode].label,
      }))}
    />
  );
}
