import { describe, expect, it, vi } from "vitest";
import { TRAINING_WEEK_SOURCE_CUSTOM_V1 } from "@/lib/planGenerator";
import { DEFAULT_SETTINGS } from "@/lib/repos";
import type { TrainingWeekDays } from "@/lib/repos";
import { bumpPlansAfterCustomSave } from "@/use-cases/trainingWeek/bumpPlansAfterCustomSave";

const mergedWeek = { 1: { dayOfWeek: 1, name: "Mon" } } as unknown as TrainingWeekDays;

describe("bumpPlansAfterCustomSave", () => {
  it("bumps revision and applies saved week to cache ports", () => {
    const bumpPlanRevision = vi.fn().mockReturnValue(3);
    const applySavedWeek = vi.fn();

    bumpPlansAfterCustomSave("2026-05-18", mergedWeek, {
      getMode: () => "authenticated",
      getSettings: () => DEFAULT_SETTINGS,
      bumpPlanRevision,
      applySavedWeek,
    });

    expect(bumpPlanRevision).toHaveBeenCalledOnce();
    expect(applySavedWeek).toHaveBeenCalledOnce();
    expect(applySavedWeek.mock.calls[0][0]).toMatchObject({
      anchorKey: "2026-05-17",
      planRevision: 3,
      weekByDow: mergedWeek,
      weekSource: TRAINING_WEEK_SOURCE_CUSTOM_V1,
    });
  });

  it("no-ops while auth is still loading", () => {
    const applySavedWeek = vi.fn();

    bumpPlansAfterCustomSave("2026-05-18", mergedWeek, {
      getMode: () => "loading",
      getSettings: () => ({} as never),
      bumpPlanRevision: vi.fn(),
      applySavedWeek,
    });

    expect(applySavedWeek).not.toHaveBeenCalled();
  });
});
