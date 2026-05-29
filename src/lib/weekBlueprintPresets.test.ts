import { describe, expect, it } from "vitest";
import {
  buildPplBalancedWeekBlueprint,
  weekBlueprintForPreset,
  WEEK_BLUEPRINT_PRESETS,
} from "@/lib/weekBlueprintPresets";
import { resolveBlueprintForManualSeed } from "@/lib/manualWeekSeed";
import type { WeekBlueprint } from "@/lib/weekBlueprint";

describe("weekBlueprintPresets", () => {
  it("exposes upper/lower and PPL presets", () => {
    expect(WEEK_BLUEPRINT_PRESETS.map((p) => p.id)).toEqual([
      "upper_lower",
      "ppl_balanced",
    ]);
  });

  it("PPL preset matches balanced shell round counts", () => {
    const blueprint = buildPplBalancedWeekBlueprint();
    expect(blueprint[1]?.rounds).toHaveLength(3);
    expect(blueprint[3]?.rounds).toHaveLength(4);
    expect(blueprint[0]?.dayKind).toBe("active_recovery");
    expect(blueprint[1]?.rounds[0]?.groups).toContain("upper_push");
  });

  it("weekBlueprintForPreset returns catalog for upper/lower", () => {
    const preset = weekBlueprintForPreset("upper_lower");
    expect(preset[0]?.rounds.length).toBeGreaterThan(0);
  });
});

describe("resolveBlueprintForManualSeed", () => {
  it("prefers saved blueprint when customized", () => {
    const custom: WeekBlueprint = {
      2: { dayKind: "workout", rounds: [{ groups: ["lower"] }] },
    };
    const resolved = resolveBlueprintForManualSeed({
      weekBlueprint: custom,
      weekBlueprintCustomized: true,
    });
    expect(resolved[2]?.rounds).toHaveLength(1);
  });

  it("uses preset when presetId provided", () => {
    const resolved = resolveBlueprintForManualSeed({}, "ppl_balanced");
    expect(resolved[1]?.rounds[0]?.groups).toContain("upper_push");
  });
});
