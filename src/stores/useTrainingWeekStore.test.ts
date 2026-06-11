import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTrainingWeekDepsKey } from "@/lib/trainingWeekCacheKey";
import type { TrainingWeekDays } from "@/lib/repos";
import {
  normalizeWeekAnchorKey,
  useTrainingWeekStore,
} from "@/stores/useTrainingWeekStore";

const resolveTrainingWeekBundleForAuth = vi.fn();

vi.mock("@/lib/planResolver", () => ({
  resolveTrainingWeekBundleForAuth: (...args: unknown[]) =>
    resolveTrainingWeekBundleForAuth(...args),
}));

const weekA = { 0: { dayOfWeek: 0, name: "Sun-A" } } as unknown as TrainingWeekDays;
const weekB = { 1: { dayOfWeek: 1, name: "Mon-B" } } as unknown as TrainingWeekDays;

const deps = {
  planRevision: 1,
  equipmentKey: "dumbbells",
  programProfileKey: "preset",
  stretchDefaultsKey: "stretch-a",
};

describe("useTrainingWeekStore", () => {
  beforeEach(() => {
    useTrainingWeekStore.getState().invalidate();
    resolveTrainingWeekBundleForAuth.mockReset();
    resolveTrainingWeekBundleForAuth.mockResolvedValue({
      days: weekA,
      source: "generated_v1",
    });
  });

  it("normalizes any in-week date to the Sunday anchor key", async () => {
    const store = useTrainingWeekStore.getState();
    await store.ensureWeek("2026-05-18", "guest", deps);
    expect(normalizeWeekAnchorKey("2026-05-18")).toBe("2026-05-17");
    expect(useTrainingWeekStore.getState().entry?.anchorKey).toBe("2026-05-17");
    expect(resolveTrainingWeekBundleForAuth).toHaveBeenCalledWith(
      "2026-05-17",
      "guest",
    );
  });

  it("dedupes parallel resolves for the same anchor and deps", async () => {
    const store = useTrainingWeekStore.getState();
    const p1 = store.ensureWeek("2026-05-17", "guest", deps);
    const p2 = store.ensureWeek("2026-05-17", "guest", deps);
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b);
    expect(resolveTrainingWeekBundleForAuth).toHaveBeenCalledTimes(1);
  });

  it("returns cached week without a second resolve when revision matches", async () => {
    const store = useTrainingWeekStore.getState();
    await store.ensureWeek("2026-05-17", "guest", deps);
    resolveTrainingWeekBundleForAuth.mockResolvedValue({
      days: weekB,
      source: "generated_v1",
    });
    const cached = await store.ensureWeek("2026-05-17", "guest", deps);
    expect(cached).toEqual(weekA);
    expect(resolveTrainingWeekBundleForAuth).toHaveBeenCalledTimes(1);
  });

  it("applySavedWeek serves the next revision without refetching", async () => {
    const store = useTrainingWeekStore.getState();
    await store.ensureWeek("2026-05-17", "guest", deps);
    const depsKey = buildTrainingWeekDepsKey({
      mode: "guest",
      equipmentKey: deps.equipmentKey,
      programProfileKey: deps.programProfileKey,
      stretchDefaultsKey: deps.stretchDefaultsKey,
    });
    store.applySavedWeek("2026-05-17", depsKey, 2, weekB);
    const cached = await store.ensureWeek("2026-05-17", "guest", {
      ...deps,
      planRevision: 2,
    });
    expect(cached).toEqual(weekB);
    expect(resolveTrainingWeekBundleForAuth).toHaveBeenCalledTimes(1);
  });

  it("stores week source from the resolver bundle", async () => {
    const store = useTrainingWeekStore.getState();
    await store.ensureWeek("2026-05-17", "guest", deps);
    expect(useTrainingWeekStore.getState().entry?.weekSource).toBe(
      "generated_v1",
    );
  });
});
