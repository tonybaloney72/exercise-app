import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/repos";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const loadMock = vi.fn();
const saveMock = vi.fn();

vi.mock("@/lib/repos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repos")>();
  return {
    ...actual,
    getSettingsRepo: () => ({
      load: loadMock,
      save: saveMock,
    }),
  };
});

describe("useSettingsStore hydration race", () => {
  beforeEach(() => {
    loadMock.mockReset();
    saveMock.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ mode: "guest", user: null });
    useExercisePreferencesStore.setState({ byExerciseId: {} });
    useSettingsStore.setState({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      hydratedForAuthKey: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not overwrite a toggle that runs while loadSettings is in flight", async () => {
    let resolveLoad: (value: typeof DEFAULT_SETTINGS) => void = () => {};
    loadMock.mockImplementation(
      () =>
        new Promise<typeof DEFAULT_SETTINGS>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const loadPromise = useSettingsStore.getState().loadSettings();

    await useSettingsStore.getState().updateSettings({
      restTimerAutoStart: false,
    });

    expect(useSettingsStore.getState().restTimerAutoStart).toBe(false);
    expect(saveMock).toHaveBeenCalled();

    resolveLoad({ ...DEFAULT_SETTINGS, restTimerAutoStart: true });
    await loadPromise;

    expect(useSettingsStore.getState().restTimerAutoStart).toBe(false);
    expect(useSettingsStore.getState().hydratedForAuthKey).toBe("guest");
  });
});
