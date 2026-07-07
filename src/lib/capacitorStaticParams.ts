import { CARDIO_ACTIVITY_ORDER } from "@/lib/cardioKinds";
import { HEALTH_STAT_DISPLAY } from "@/lib/health/healthStatRoutes";

/** Placeholder for Next static export; real dates are client-routed in the APK. */
const CAPACITOR_STATIC_DATE_PARAM = "export-placeholder";

export function capacitorDateStaticParams() {
  return [{ date: CAPACITOR_STATIC_DATE_PARAM }];
}

export function cardioKindStaticParams() {
  return CARDIO_ACTIVITY_ORDER.map((kind) => ({ kind }));
}

export function healthStatStaticParams() {
  return HEALTH_STAT_DISPLAY.map((row) => ({ stat: row.slug }));
}
