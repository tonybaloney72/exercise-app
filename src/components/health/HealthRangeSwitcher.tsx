"use client";

import {
  HEALTH_RANGE_PRESETS,
  type HealthRangePresetId,
} from "@/lib/health/healthRangePresets";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";

export default function HealthRangeSwitcher({
  value,
  onChange,
}: {
  value: HealthRangePresetId;
  onChange: (next: HealthRangePresetId) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Time range"
    >
      {HEALTH_RANGE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          className={uiChoicePillSolidClass(value === preset.id)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
