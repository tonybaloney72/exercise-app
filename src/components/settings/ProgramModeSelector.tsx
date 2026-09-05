"use client";

import SettingsSegmentedControl from "@/components/settings/SettingsSegmentedControl";
import {
  PROGRAM_MODE_LABELS,
  type ProgramMode,
} from "@/lib/weeklyCategoryLayout";

type Props = {
  value: ProgramMode;
  onChange: (mode: ProgramMode) => void;
};

const MODES: ProgramMode[] = ["preset", "custom"];

export default function ProgramModeSelector({ value, onChange }: Props) {
  const active = PROGRAM_MODE_LABELS[value];

  return (
    <div id="your-week-settings">
      <SettingsSegmentedControl
        value={value}
        onChange={onChange}
        aria-label="How to build your week"
        description={active.description}
        options={MODES.map((mode) => ({
          value: mode,
          label: PROGRAM_MODE_LABELS[mode].label,
        }))}
      />
    </div>
  );
}
