import type { BodySexAtBirth, UserSettings } from "@/types";
import { normalizeWeightDateKey } from "@/lib/weightLog";

export type BodyProfile = {
  sex: BodySexAtBirth;
  birthDate: string;
  heightIn: number;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeBodySexAtBirth(raw: unknown): BodySexAtBirth | null {
  return raw === "male" || raw === "female" ? raw : null;
}

export function sanitizeBodyBirthDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = normalizeWeightDateKey(raw.trim());
  if (!DATE_KEY_RE.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T12:00:00`);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return null;
  return trimmed;
}

export function sanitizeBodyHeightIn(raw: unknown): number | null {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw.trim())
        : NaN;
  if (!Number.isFinite(value) || value < 48 || value > 96) return null;
  return Math.round(value * 10) / 10;
}

export function bodyProfileFromSettings(
  settings: Pick<UserSettings, "bodySexAtBirth" | "bodyBirthDate" | "bodyHeightIn">,
): BodyProfile | null {
  const sex = sanitizeBodySexAtBirth(settings.bodySexAtBirth);
  const birthDate = sanitizeBodyBirthDate(settings.bodyBirthDate);
  const heightIn = sanitizeBodyHeightIn(settings.bodyHeightIn);
  if (!sex || !birthDate || heightIn == null) return null;
  return { sex, birthDate, heightIn };
}

export function isBodyProfileComplete(
  profile: BodyProfile | null,
): profile is BodyProfile {
  return profile != null;
}

export function formatHeightIn(heightIn: number): string {
  const totalInches = Math.round(heightIn);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}′${inches}″`;
}

export function parseHeightFields(heightIn: number | null | undefined): {
  feet: string;
  inches: string;
} {
  if (heightIn == null || !(heightIn > 0)) {
    return { feet: "", inches: "" };
  }
  const total = Math.round(heightIn);
  return {
    feet: String(Math.floor(total / 12)),
    inches: String(total % 12),
  };
}

export function heightInFromFields(
  feetRaw: string,
  inchesRaw: string,
): number | null {
  const feet = Number(feetRaw);
  const inches = Number(inchesRaw);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
  if (feet < 3 || feet > 8) return null;
  if (inches < 0 || inches >= 12) return null;
  const total = feet * 12 + inches;
  return total >= 48 && total <= 96 ? total : null;
}
