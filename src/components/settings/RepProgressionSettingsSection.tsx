"use client";

import SettingsSwitch from "@/components/settings/SettingsSwitch";
import { buildExerciseSettingsClearRepSuggestionIgnore } from "@/lib/applyRepIncreaseSuggestion";
import { resolveExerciseDisplayName } from "@/lib/exerciseDisplayName";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

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

  return (
    <>
      <SettingsSwitch
        title="Suggest rep increases"
        description="After you consistently beat your targets, offer to bump Library defaults on Today when you finish a workout."
        checked={settings.suggestRepIncreases}
        onChange={() =>
          settings.updateSettings({
            suggestRepIncreases: !settings.suggestRepIncreases,
          })
        }
      />

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
