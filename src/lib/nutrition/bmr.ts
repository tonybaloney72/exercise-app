import type { WeightLogEntry } from "@/types";
import { getWeightForDateOrNearestPrior } from "@/lib/weightLog";
import type { BodyProfile } from "@/lib/bodyProfile";
import { isBodyProfileComplete } from "@/lib/bodyProfile";
import type { BodySexAtBirth } from "@/types";
import { parseLocalDateKey } from "@/utils/localDateKey";

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

/** Mifflin–St Jeor BMR (kcal per 24 hours). */
export function bmrMifflinStJeor(options: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BodySexAtBirth;
}): number {
  const { weightKg, heightCm, ageYears, sex } = options;
  if (
    !(weightKg > 0) ||
    !(heightCm > 0) ||
    !(ageYears > 0) ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(ageYears)
  ) {
    return NaN;
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = sex === "male" ? base + 5 : base - 161;
  return Math.round(bmr);
}

export function ageYearsOnDate(birthDate: string, dateKey: string): number | null {
  const birth = parseLocalDateKey(birthDate);
  const onDate = parseLocalDateKey(dateKey);
  if (!birth || !onDate) return null;

  let age = onDate.getFullYear() - birth.getFullYear();
  const monthDelta = onDate.getMonth() - birth.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && onDate.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function estimateDailyBmr(options: {
  profile: BodyProfile;
  weightEntries: readonly WeightLogEntry[];
  dateKey: string;
}): number | null {
  const { profile, weightEntries, dateKey } = options;
  if (!isBodyProfileComplete(profile)) return null;

  const weightEntry = getWeightForDateOrNearestPrior(weightEntries, dateKey);
  if (!weightEntry || !(weightEntry.weightLb > 0)) return null;

  const ageYears = ageYearsOnDate(profile.birthDate, dateKey);
  if (ageYears == null || ageYears < 10 || ageYears > 120) return null;

  const bmr = bmrMifflinStJeor({
    weightKg: weightEntry.weightLb * LB_TO_KG,
    heightCm: profile.heightIn * IN_TO_CM,
    ageYears,
    sex: profile.sex,
  });
  return Number.isFinite(bmr) && bmr > 0 ? bmr : null;
}

/** Passive burn accumulated from midnight through `now` (local time). */
export function passiveKcalSoFarToday(
  bmrDaily: number,
  now: Date = new Date(),
): number {
  if (!(bmrDaily > 0)) return 0;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const fraction = Math.min(1, elapsedMs / (24 * 60 * 60 * 1000));
  return Math.round(bmrDaily * fraction);
}

export function sumDailyBmrForDateKeys(
  dateKeys: readonly string[],
  profile: BodyProfile,
  weightEntries: readonly WeightLogEntry[],
): number | null {
  if (dateKeys.length === 0) return null;
  let total = 0;
  let any = false;
  for (const dateKey of dateKeys) {
    const dayBmr = estimateDailyBmr({ profile, weightEntries, dateKey });
    if (dayBmr == null) continue;
    total += dayBmr;
    any = true;
  }
  return any ? total : null;
}
