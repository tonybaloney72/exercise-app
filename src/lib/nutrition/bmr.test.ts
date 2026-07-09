import { describe, expect, it } from "vitest";
import {
  ageYearsOnDate,
  bmrMifflinStJeor,
  estimateDailyBmr,
  passiveKcalSoFarToday,
  sumDailyBmrForDateKeys,
} from "@/lib/nutrition/bmr";
import type { BodyProfile } from "@/lib/bodyProfile";

const profile: BodyProfile = {
  sex: "male",
  birthDate: "1991-01-15",
  heightIn: 70,
};

describe("bmrMifflinStJeor", () => {
  it("matches a typical male example", () => {
    expect(
      bmrMifflinStJeor({
        weightKg: 81.6,
        heightCm: 178,
        ageYears: 35,
        sex: "male",
      }),
    ).toBe(1759);
  });

  it("matches a typical female example", () => {
    expect(
      bmrMifflinStJeor({
        weightKg: 61.2,
        heightCm: 165,
        ageYears: 30,
        sex: "female",
      }),
    ).toBe(1332);
  });
});

describe("ageYearsOnDate", () => {
  it("counts age on a later calendar day", () => {
    expect(ageYearsOnDate("1991-01-15", "2026-07-09")).toBe(35);
  });
});

describe("estimateDailyBmr", () => {
  it("uses weight for the requested day", () => {
    const bmr = estimateDailyBmr({
      profile,
      weightEntries: [
        { date: "2026-07-08", weightLb: 190 },
        { date: "2026-07-09", weightLb: 180 },
      ],
      dateKey: "2026-07-09",
    });
    expect(bmr).toBe(1758);
  });

  it("falls back to the nearest prior weight", () => {
    const bmr = estimateDailyBmr({
      profile,
      weightEntries: [{ date: "2026-07-01", weightLb: 180 }],
      dateKey: "2026-07-09",
    });
    expect(bmr).toBe(1758);
  });
});

describe("passiveKcalSoFarToday", () => {
  it("prorates BMR by elapsed local day fraction", () => {
    const now = new Date(2026, 6, 9, 12, 0, 0);
    expect(passiveKcalSoFarToday(2400, now)).toBe(1200);
  });
});

describe("sumDailyBmrForDateKeys", () => {
  it("sums daily estimates across a range", () => {
    const total = sumDailyBmrForDateKeys(
      ["2026-07-08", "2026-07-09"],
      profile,
      [{ date: "2026-07-01", weightLb: 180 }],
    );
    expect(total).toBe(1758 * 2);
  });
});
