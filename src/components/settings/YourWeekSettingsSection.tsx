"use client";

import Link from "next/link";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import CustomBuildStyleSelector from "@/components/settings/CustomBuildStyleSelector";
import ProgramModeSelector from "@/components/settings/ProgramModeSelector";
import PplWeekScheduleEditor from "@/components/settings/PplWeekScheduleEditor";
import StretchCountEditor from "@/components/settings/StretchCountEditor";
import WeekBuilderMigrationBanner from "@/components/settings/WeekBuilderMigrationBanner";
import WeeklyCardioEditor from "@/components/settings/WeeklyCardioEditor";
import { ROUND_DENSITY_OPTIONS } from "@/lib/programProfile";
import { PPL_ROUND_DENSITY_OPTIONS } from "@/lib/pplRoundDensity";
import type { CustomBuildStyle } from "@/lib/weekBlueprint";
import type { ProgramMode } from "@/lib/weeklyCategoryLayout";
import type { UserSettings } from "@/types";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function YourWeekSettingsSection() {
  const settings = useSettingsStore();

  return (
    <>
      {!settings.weekBuilderMigrationAcknowledged ? (
        <WeekBuilderMigrationBanner
          onDismiss={() =>
            void settings.updateSettings({
              weekBuilderMigrationAcknowledged: true,
            })
          }
        />
      ) : null}

      <ProgramModeSelector
        value={settings.programMode}
        onChange={(programMode: ProgramMode) => {
          const patch: Partial<UserSettings> = { programMode };
          if (programMode === "custom" && settings.programMode !== "custom") {
            patch.customBuildStyle = "guided";
          }
          void settings.updateSettings(patch);
        }}
      />

      {settings.programMode === "custom" ? (
        <CustomBuildStyleSelector
          value={settings.customBuildStyle}
          onChange={(customBuildStyle: CustomBuildStyle) =>
            void settings.updateSettings({ customBuildStyle })
          }
        />
      ) : null}

      {settings.programMode === "custom" &&
      settings.customBuildStyle === "manual" ? (
        <div className="flex flex-col gap-2">
          <Link
            href="/weekly/build"
            className="w-full rounded-xl bg-accent py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Open week builder
          </Link>
          <p className="text-xs text-muted leading-snug">
            Pick every exercise yourself, or start from a template (upper/lower
            or PPL) and tweak in the editor.
          </p>
        </div>
      ) : null}

      {settings.programMode === "custom" &&
      settings.customBuildStyle === "guided" ? (
        <div className="flex flex-col gap-2">
          <Link
            href="/weekly/build-guided"
            className="w-full rounded-xl bg-accent py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            Plan guided week
          </Link>
          <p className="text-xs text-muted leading-snug">
            Walk through Sun–Sat: day type, rounds, groups per round, and
            optional cardio. We generate exercises from your plan.
          </p>
        </div>
      ) : null}

      {settings.programMode === "preset" ? (
        <CollapsibleSection
          embedded
          title="Week schedule"
          hint=""
          defaultOpen
        >
          <PplWeekScheduleEditor
            value={settings.weeklyPplSchedule}
            onChange={(weeklyPplSchedule, weeklyPplScheduleCustomized) => {
              void settings.updateSettings({
                weeklyPplSchedule,
                weeklyPplScheduleCustomized,
              });
            }}
          />
        </CollapsibleSection>
      ) : null}

      {settings.programMode !== "custom" ? (
        <CollapsibleSection
          embedded
          title="Cardio & endurance"
          hint={
            settings.programMode === "preset"
              ? "Pick jog, walk, cycle, etc. for any day of the week."
              : "Jog, walk, cycle, hike, or swim per day - log time and distance in the workout."
          }
          defaultOpen={false}
        >
          <WeeklyCardioEditor
            value={settings.weeklyCardioByDay}
            onChange={(weeklyCardioByDay, weeklyCardioCustomized) => {
              void settings.updateSettings({
                weeklyCardioByDay,
                weeklyCardioCustomized,
              });
            }}
          />
        </CollapsibleSection>
      ) : null}

      {settings.programMode !== "custom" && (
        <CollapsibleSection
          embedded
          title="Round density"
          hint={
            settings.programMode === "preset"
              ? "Exercises per working round (rounds 1–3) and size of the leg-day core block"
              : "How many exercises per round when your week is generated"
          }
          defaultOpen={false}
        >
          <div
            className="flex flex-col gap-2"
            role="radiogroup"
            aria-label="Round density"
          >
            {(settings.programMode === "preset"
              ? PPL_ROUND_DENSITY_OPTIONS
              : ROUND_DENSITY_OPTIONS
            ).map((option) => {
              const selected = settings.roundDensity === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() =>
                    void settings.updateSettings({
                      roundDensity: option.value,
                    })
                  }
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-hover hover:border-accent/30"
                  }`}
                >
                  <span
                    className={`block text-sm font-medium ${
                      selected ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        embedded
        title="Stretches per day"
        hint="How many warm-up and cool-down stretches to generate for each training day"
        defaultOpen={false}
      >
        <StretchCountEditor
          warmUpStretchCount={settings.warmUpStretchCount}
          coolDownStretchCount={settings.coolDownStretchCount}
          onChange={(patch) => void settings.updateSettings(patch)}
        />
      </CollapsibleSection>
    </>
  );
}
