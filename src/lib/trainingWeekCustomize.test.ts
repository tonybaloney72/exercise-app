import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { DEFAULT_AVAILABLE_EQUIPMENT } from "@/data/equipment";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import { TRAINING_WEEK_SOURCE_CUSTOM_V1 } from "@/lib/planGenerator";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import {
  buildGeneratedDayPlan,
  dayPlanForCustomSave,
  resetDayToGenerated,
} from "@/lib/trainingWeekCustomize";
import type { DayPlan, StretchEntry } from "@/types";
import type { ExercisePreferenceMap, TrainingWeekDays } from "@/lib/repos";

const EQUIP = [...DEFAULT_AVAILABLE_EQUIPMENT];
const EMPTY_PREFS: ExercisePreferenceMap = {};

function authStretchCtx(
  warmUp: StretchEntry[] = [],
  coolDown: StretchEntry[] = [],
) {
  return buildStretchResolveContextFromInputs({
    defaultWarmUp: warmUp,
    defaultCoolDown: coolDown,
    authMode: "authenticated",
    exercisePreferences: {},
  });
}

describe("dayPlanForCustomSave", () => {
  it("omits warmUp/coolDown when lists match derived stretches", () => {
    const monday = buildCatalogWeek()[1]!;
    const ctx = authStretchCtx();
    const derived = resolveStretchesForDay(monday, ctx);
    const withDerivedOnly: DayPlan = {
      ...monday,
      warmUp: derived.warmUp,
      coolDown: derived.coolDown,
    };
    const saved = dayPlanForCustomSave(withDerivedOnly, ctx);
    expect(saved.warmUp).toBeUndefined();
    expect(saved.coolDown).toBeUndefined();
  });

  it("persists stretch overrides that differ from auto-derived", () => {
    const monday = buildCatalogWeek()[1]!;
    const ctx = authStretchCtx();
    const override: StretchEntry[] = [{ exerciseId: "SC-15", targetReps: "20–30 sec" }];
    const saved = dayPlanForCustomSave({ ...monday, coolDown: override }, ctx);
    expect(saved.coolDown?.map((e) => e.exerciseId)).toEqual(["SC-15"]);
    expect(saved.warmUp).toBeUndefined();
  });

  it("strips legacy defaultWarmUp/defaultCoolDown fields from the saved shape", () => {
    const monday = buildCatalogWeek()[1]!;
    const ctx = authStretchCtx();
    const legacy = {
      ...monday,
      defaultWarmUp: [{ exerciseId: "SW-1", targetReps: "10" }],
      defaultCoolDown: [{ exerciseId: "SC-2", targetReps: "30 sec" }],
    } as DayPlan & {
      defaultWarmUp: StretchEntry[];
      defaultCoolDown: StretchEntry[];
    };
    const saved = dayPlanForCustomSave(legacy, ctx);
    expect("defaultWarmUp" in saved).toBe(false);
    expect("defaultCoolDown" in saved).toBe(false);
  });
});

describe("buildGeneratedDayPlan", () => {
  it("returns the materialized catalog day with dayOfWeek set", () => {
    const week = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    const built = buildGeneratedDayPlan(1, EMPTY_PREFS, EQUIP, "balanced", "standard");
    expect(built.dayOfWeek).toBe(1);
    expect(built.rounds).toEqual(week[1]!.rounds);
  });

  it("reflects program focus changes in round shaping", () => {
    const minimal = buildGeneratedDayPlan(1, EMPTY_PREFS, EQUIP, "minimal_core", "compact");
    const coreHeavy = buildGeneratedDayPlan(
      1,
      EMPTY_PREFS,
      EQUIP,
      "core_emphasis",
      "compact",
    );
    const countCore = (plan: DayPlan) =>
      plan.rounds[0]!.exercises.filter((ex) =>
        ["CF", "CL", "CR", "CS"].includes(ex.category),
      ).length;
    expect(countCore(minimal)).toBeLessThan(countCore(coreHeavy));
  });
});

const mockLoadWeek = vi.fn();
const mockSaveSeededWeek = vi.fn();
const mockResolveWeek = vi.fn();
const mockLoadPrefs = vi.fn();
const mockLoadSettings = vi.fn();

vi.mock("@/lib/repos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repos")>();
  return {
    ...actual,
    getExercisePreferenceRepo: () => ({
      loadAll: mockLoadPrefs,
    }),
    getSettingsRepo: () => ({
      load: mockLoadSettings,
    }),
    getTrainingWeekRepo: () => ({
      loadWeek: mockLoadWeek,
      saveSeededWeek: mockSaveSeededWeek,
    }),
  };
});

vi.mock("@/lib/planResolver", () => ({
  refreshTrainingWeekContaining: vi.fn(),
  resolveTrainingWeekForAuth: (...args: unknown[]) => mockResolveWeek(...args),
}));

describe("resetDayToGenerated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadPrefs.mockResolvedValue(EMPTY_PREFS);
    mockLoadSettings.mockResolvedValue({
      availableEquipment: EQUIP,
      programFocus: "balanced",
      roundDensity: "standard",
      defaultWarmUp: [],
      defaultCoolDown: [],
    });
  });

  it("replaces only the target day and preserves custom week source", async () => {
    const catalogWeek = materializeTrainingWeek(
      buildCatalogWeek(),
      EMPTY_PREFS,
      EQUIP,
      "balanced",
      "standard",
    );
    const customizedMonday: DayPlan = {
      ...catalogWeek[1]!,
      theme: "User edited Monday",
    };
    const storedWeek: TrainingWeekDays = {
      ...catalogWeek,
      1: customizedMonday,
    };
    mockResolveWeek.mockResolvedValue(storedWeek);
    mockLoadWeek.mockResolvedValue({
      source: TRAINING_WEEK_SOURCE_CUSTOM_V1,
      days: storedWeek,
    });

    const fresh = await resetDayToGenerated("2026-05-11");

    expect(fresh.theme).not.toBe("User edited Monday");
    expect(fresh.dayOfWeek).toBe(1);
    expect(mockSaveSeededWeek).toHaveBeenCalledOnce();
    const [, merged, options] = mockSaveSeededWeek.mock.calls[0]!;
    expect(merged[1]?.theme).not.toBe("User edited Monday");
    expect(merged[0]).toEqual(storedWeek[0]);
    expect(options.source).toBe(TRAINING_WEEK_SOURCE_CUSTOM_V1);
  });
});
