"use client";

import SettingsSwitch from "@/components/settings/SettingsSwitch";
import { buildExerciseSettingsClearRepSuggestionIgnore } from "@/lib/applyRepIncreaseSuggestion";
import { resolveExerciseDisplayName } from "@/lib/exerciseDisplayName";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { RepIncreaseBump } from "@/types";

const bumpChip =
  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";

export default function RepProgressionSettingsSection() {
  const settings = useSettingsStore();
  const byExerciseId = useExerciseSettingsStore((s) => s.byExerciseId);
  const upsert = useExerciseSettingsStore((s) => s.upsert);

  const ignoredExerciseIds = Object.entries(byExerciseId)
    .filter(([, values]) => values.repSuggestionIgnored === true)
    .map(([id]) => id)
    .sort((a, b) =>
      resolveExerciseDisplayName(a).localeCompare(
        resolveExerciseDisplayName(b),
        undefined,
        { sensitivity: "base" },
      ),
    );

  function setBump(bump: RepIncreaseBump) {
    void settings.updateSettings({ repIncreaseBump: bump });
  }

  return (
    <>
      <SettingsSwitch
        title="Suggest stronger defaults"
        description="After you finish today’s workout, we may offer to raise an exercise’s Library default (reps, time, or weight). A set counts when you beat the target by at least 1 on the last time you did that move in the session-enough qualifying sessions in a row (or often enough if you train it more) unlocks a suggestion."
        checked={settings.suggestRepIncreases}
        onChange={() =>
          settings.updateSettings({
            suggestRepIncreases: !settings.suggestRepIncreases,
          })
        }
      />

      {settings.suggestRepIncreases ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground">
            Default bump size
          </p>
          <p className="text-xs text-muted">
            How much to raise Library reps or seconds when you accept a
            suggestion. Weight jumps still use the next size in your inventory.
          </p>
          <div className="flex flex-wrap gap-2">
            {([1, 2] as const).map((bump) => {
              const selected = settings.repIncreaseBump === bump;
              return (
                <button
                  key={bump}
                  type="button"
                  onClick={() => setBump(bump)}
                  className={`${bumpChip} ${
                    selected
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface-hover text-muted hover:text-foreground"
                  }`}
                >
                  +{bump}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {ignoredExerciseIds.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground">
            Ignored for suggestions
          </p>
          <p className="text-xs text-muted">
            Re-enable suggestions per exercise here or from Library.
          </p>
          <ul className="flex flex-col gap-2">
            {ignoredExerciseIds.map((exerciseId) => (
              <li
                key={exerciseId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-hover px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  {resolveExerciseDisplayName(exerciseId)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void upsert(
                      exerciseId,
                      buildExerciseSettingsClearRepSuggestionIgnore(
                        exerciseId,
                        byExerciseId[exerciseId],
                      ),
                    )
                  }
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  Allow
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
