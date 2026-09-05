import { describe, expect, it } from "vitest";
import { resolveExerciseSettings } from "@/utils/effectiveExerciseSettings";
import { exerciseMap } from "@/core/catalog";

describe("resolveExerciseSettings timer fallback", () => {
  it("uses catalog seconds when no Library timer is saved", () => {
    const cobra = exerciseMap["SC-1"];
    expect(cobra?.name).toBe("Cobra Stretch");
    const resolved = resolveExerciseSettings(cobra!, undefined);
    expect(resolved.defaultSetMode).toBe("timer");
    expect(resolved.defaultTimerSeconds).toBe(20);
  });

  it("uses saved Library timer when present", () => {
    const cobra = exerciseMap["SC-1"]!;
    const resolved = resolveExerciseSettings(cobra, {
      defaultSetMode: "timer",
      defaultTimerSeconds: 45,
    });
    expect(resolved.defaultTimerSeconds).toBe(45);
  });
});
