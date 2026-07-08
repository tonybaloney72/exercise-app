import { parseLocalDateKey } from "@/utils/localDateKey";

const MS_PER_DAY = 86_400_000;

/** FatSecret `date` / `date_int`: days since 1970-01-01 UTC for a local calendar day. */
export function localDateKeyToFatSecretDateInt(dateKey: string): number {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const utcMs = Date.UTC(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  return Math.floor(utcMs / MS_PER_DAY);
}

export function fatSecretDateIntToLocalDateKey(dateInt: number): string {
  const utc = new Date(dateInt * MS_PER_DAY);
  const y = utc.getUTCFullYear();
  const m = String(utc.getMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
