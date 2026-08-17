import { describe, expect, it } from "vitest";
import {
  scaleCatalogRepPrescription,
  scalePrescriptionNumbers,
  scaleTimerSeconds,
  scaledCatalogPrescription,
  scaledDefaultTimerSeconds,
} from "@/lib/prescriptionScaling";
import { formatPlanTargetPrescription, resolveStrengthTargetLabel } from "@/utils/effectiveExerciseSettings";
import type { ExpertiseByGroup } from "@/types";

const beginnerUpper: ExpertiseByGroup = {
  core: "intermediate",
  cardio: "intermediate",
  lower: "intermediate",
  upper_push: "beginner",
  upper_pull: "intermediate",
};

describe("prescriptionScaling", () => {
  it("scales rep ranges for beginner upper push", () => {
    expect(
      scaleCatalogRepPrescription("10–12", "UP", beginnerUpper),
    ).toBe("5–6");
  });

  it("preserves suffix text when scaling reps", () => {
    expect(
      scaleCatalogRepPrescription("20 each side", "PC", {
        ...beginnerUpper,
        cardio: "beginner",
      }),
    ).toBe("10 each side");
  });

  it("leaves intermediate caps at catalog defaults", () => {
    expect(
      scaleCatalogRepPrescription("10–12", "UP", beginnerUpper),
    ).not.toBe("10–12");
    expect(
      scaleCatalogRepPrescription("10–12", "UP", {
        ...beginnerUpper,
        upper_push: "intermediate",
      }),
    ).toBe("10–12");
  });

  it("does not scale stretch categories without emphasis group", () => {
    expect(scaleCatalogRepPrescription("30 sec", "SW", beginnerUpper)).toBe(
      "30 sec",
    );
  });

  it("rounds timer seconds to nearest 5", () => {
    expect(scaleTimerSeconds(45, "UP", beginnerUpper)).toBe(30);
    expect(scaleTimerSeconds(30, "UP", beginnerUpper)).toBe(20);
  });

  it("scales timer catalog prescriptions", () => {
    expect(
      scaledDefaultTimerSeconds(
        {
          isTimeBased: true,
          defaultReps: "45 sec",
          category: "CS",
        },
        { ...beginnerUpper, core: "beginner" },
      ),
    ).toBe(30);
  });

  it("scalePrescriptionNumbers replaces each numeric token", () => {
    expect(scalePrescriptionNumbers("8–10", 0.5)).toBe("4–5");
  });
});

describe("formatPlanTargetPrescription with expertise", () => {
  it("uses library rep override without scaling", () => {
    expect(
      formatPlanTargetPrescription(
        {
          isTimeBased: false,
          defaultReps: "10–12",
          category: "UP",
        },
        { defaultSetMode: "reps", defaultTargetReps: 8 },
        { expertiseByGroup: beginnerUpper },
      ),
    ).toBe("8");
  });

  it("scales catalog reps when no library override", () => {
    expect(
      formatPlanTargetPrescription(
        {
          isTimeBased: false,
          defaultReps: "10–12",
          category: "UP",
        },
        undefined,
        { expertiseByGroup: beginnerUpper },
      ),
    ).toBe("5–6");
  });

  it("scales timer fallback when no library override", () => {
    expect(
      formatPlanTargetPrescription(
        {
          isTimeBased: true,
          defaultReps: "45 sec",
          category: "CS",
        },
        undefined,
        {
          expertiseByGroup: { ...beginnerUpper, core: "beginner" },
        },
      ),
    ).toBe("30 sec");
  });

  it("uses library timer override without scaling", () => {
    expect(
      formatPlanTargetPrescription(
        {
          isTimeBased: true,
          defaultReps: "45 sec",
          category: "CS",
        },
        { defaultSetMode: "timer", defaultTimerSeconds: 60 },
        {
          expertiseByGroup: { ...beginnerUpper, core: "beginner" },
        },
      ),
    ).toBe("60 sec");
  });

  it("scaledCatalogPrescription respects isTimeBased flag", () => {
    expect(
      scaledCatalogPrescription(
        {
          isTimeBased: false,
          defaultReps: "12",
          category: "UP",
        },
        beginnerUpper,
      ),
    ).toBe("6");
  });
});

describe("resolveStrengthTargetLabel", () => {
  const dips = {
    isTimeBased: false as const,
    defaultReps: "8",
    category: "UP" as const,
  };

  it("prefers library reps over a stale catalog/plan prescription", () => {
    expect(
      resolveStrengthTargetLabel(
        dips,
        { defaultSetMode: "reps", defaultTargetReps: 10 },
        "8",
      ),
    ).toBe("10");
  });

  it("keeps the session prescription when there is no library override", () => {
    expect(resolveStrengthTargetLabel(dips, undefined, "8")).toBe("8");
  });
});
