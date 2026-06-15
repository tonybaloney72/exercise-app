import {
  selectEquipmentDependencyKey,
  selectStretchDefaultsKey,
  selectTrainingWeekCacheKey,
} from "@/lib/planResolverDeps";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useTrainingWeekStore } from "@/stores/useTrainingWeekStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

/** Reload persisted settings, caches, and the current training week. */
export async function refreshAppData(): Promise<void> {
  const mode = useAuthStore.getState().mode;
  if (mode === "loading") return;

  const settings = useSettingsStore.getState();
  const planRevision = useTrainingWeekRefreshStore.getState().planRevision;
  const equipmentKey = selectEquipmentDependencyKey(settings);
  const programProfileKey = selectTrainingWeekCacheKey(settings);
  const stretchDefaultsKey = selectStretchDefaultsKey(settings);

  await Promise.all([
    useSettingsStore.getState().loadSettings({ force: true }),
    useExerciseSettingsStore.getState().load(),
    useExercisePreferencesStore.getState().load(),
    useWorkoutStore.getState().loadHistory({ force: true }),
  ]);

  useTrainingWeekStore.getState().invalidate();
  const todayKey = formatLocalDateKey(new Date());
  await useTrainingWeekStore.getState().ensureWeek(
    todayKey,
    mode,
    {
      planRevision,
      equipmentKey,
      programProfileKey,
      stretchDefaultsKey,
    },
    { force: true },
  );
}
