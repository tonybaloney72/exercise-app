import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tryLoadGeneratorInputsFromStores } from "@/adapters/planGeneratorInputsFromStores";
import { DEFAULT_SETTINGS } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

describe("tryLoadGeneratorInputsFromStores", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    useAuthStore.setState({ mode: "guest", user: null });
    useSettingsStore.setState({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      hydratedForAuthKey: null,
    });
    useExerciseSettingsStore.setState({ byExerciseId: {} });
    useExercisePreferencesStore.setState({ byExerciseId: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null before settings hydrate", () => {
    expect(tryLoadGeneratorInputsFromStores("guest")).toBeNull();
  });

  it("returns inputs from hydrated stores without hitting repos", () => {
    useAuthStore.setState({ mode: "guest", user: null });
    useSettingsStore.setState({
      ...DEFAULT_SETTINGS,
      hydrated: true,
      hydratedForAuthKey: "guest",
      trainingPriorityPreset: "strength",
    });
    useExerciseSettingsStore.setState({
      byExerciseId: {
        push_up: { defaultSetMode: "reps", defaultTargetReps: 10 },
      },
    });
    useExercisePreferencesStore.setState({
      byExerciseId: { burpee: "disliked" },
    });

    const inputs = tryLoadGeneratorInputsFromStores("guest");
    expect(inputs).not.toBeNull();
    expect(inputs?.trainingPriorityPreset).toBe("strength");
    expect(inputs?.exerciseSettings.push_up?.defaultTargetReps).toBe(10);
    expect(inputs?.prefs.burpee).toBe("disliked");
    expect(inputs?.fingerprint.length).toBeGreaterThan(0);
  });
});
