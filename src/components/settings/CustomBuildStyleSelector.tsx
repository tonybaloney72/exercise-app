"use client";

import SettingsSegmentedControl from "@/components/settings/SettingsSegmentedControl";
import {
  CUSTOM_BUILD_STYLE_LABELS,
  type CustomBuildStyle,
} from "@/lib/weekBlueprint";

type Props = {
  value: CustomBuildStyle;
  onChange: (style: CustomBuildStyle) => void;
};

const STYLES: CustomBuildStyle[] = ["guided", "manual"];

export default function CustomBuildStyleSelector({ value, onChange }: Props) {
  const active = CUSTOM_BUILD_STYLE_LABELS[value];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted">
        How to build your custom week
      </p>
      <SettingsSegmentedControl
        value={value}
        onChange={onChange}
        aria-label="Custom week style"
        description={active.description}
        options={STYLES.map((style) => ({
          value: style,
          label: CUSTOM_BUILD_STYLE_LABELS[style].label,
        }))}
      />
    </div>
  );
}
