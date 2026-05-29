"use client";

import SurfaceCard from "@/components/common/SurfaceCard";
import {
  WEEK_BLUEPRINT_PRESETS,
  type WeekBlueprintPresetId,
} from "@/lib/weekBlueprintPresets";
import { uiChoicePillClass } from "@/lib/uiClasses";

type Props = {
  hasSavedBlueprint?: boolean;
  busy?: boolean;
  onApplyPreset: (presetId: WeekBlueprintPresetId) => void;
  onApplySavedBlueprint?: () => void;
};

export default function WeekBlueprintPresetPicker({
  hasSavedBlueprint = false,
  busy = false,
  onApplyPreset,
  onApplySavedBlueprint,
}: Props) {
  return (
    <SurfaceCard className="p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Start from a template</p>
        <p className="text-xs text-muted leading-snug">
          Generate exercises for the whole week, then tweak each day in the
          editor below.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {WEEK_BLUEPRINT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={busy}
            onClick={() => onApplyPreset(preset.id)}
            className={uiChoicePillClass(false)}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
        {hasSavedBlueprint && onApplySavedBlueprint ? (
          <button
            type="button"
            disabled={busy}
            onClick={onApplySavedBlueprint}
            className={uiChoicePillClass(false)}
            title="Use your guided week blueprint from Settings"
          >
            Saved blueprint
          </button>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
