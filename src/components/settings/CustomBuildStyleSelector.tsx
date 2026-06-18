"use client";

import {
  CUSTOM_BUILD_STYLE_LABELS,
  type CustomBuildStyle,
} from "@/lib/weekBlueprint";
import { uiChoicePillClass } from "@/lib/uiClasses";

type Props = {
  value: CustomBuildStyle;
  onChange: (style: CustomBuildStyle) => void;
};

const STYLES: CustomBuildStyle[] = ["guided", "manual"];

export default function CustomBuildStyleSelector({ value, onChange }: Props) {
  const active = CUSTOM_BUILD_STYLE_LABELS[value];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted">How to build your custom week</p>
      <div
        className="grid grid-cols-2 gap-1 rounded-lg bg-surface-hover p-1"
        role="radiogroup"
        aria-label="Custom week style"
      >
        {STYLES.map((style) => {
          const selected = value === style;
          return (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(style)}
              className={uiChoicePillClass(selected)}
            >
              {CUSTOM_BUILD_STYLE_LABELS[style].label}
            </button>
          );
        })}
      </div>
      <p className="text-sm leading-snug text-muted">{active.description}</p>
    </div>
  );
}
