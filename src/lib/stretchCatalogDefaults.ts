import type { StretchEntry } from "@/types";

/** Universal warm-up pool (guest fallback + catalog default source). */
const UNIVERSAL_WARM_UP_POOL: StretchEntry[] = [
  { exerciseId: "SW-1", targetReps: "10 each direction" },
  { exerciseId: "SW-2", targetReps: "10 each direction" },
  { exerciseId: "SW-7", targetReps: "10" },
  { exerciseId: "SW-5", targetReps: "10 each side" },
];

/** Universal cool-down pool (guest fallback + catalog default source). */
const UNIVERSAL_COOL_DOWN_POOL: StretchEntry[] = [
  { exerciseId: "SC-2", targetReps: "30 sec" },
  { exerciseId: "SC-3", targetReps: "20 sec each side" },
];

const CATALOG_DEFAULT_WARM_UP: StretchEntry[] = UNIVERSAL_WARM_UP_POOL.map(
  (e) => ({ ...e }),
);
const CATALOG_DEFAULT_COOL_DOWN: StretchEntry[] =
  UNIVERSAL_COOL_DOWN_POOL.map((e) => ({ ...e }));

/** Guest mode: catalog universal stretches when the user has not chosen any. */
export const GUEST_FALLBACK_WARM_UP: StretchEntry[] = CATALOG_DEFAULT_WARM_UP.map(
  (e) => ({ ...e }),
);
export const GUEST_FALLBACK_COOL_DOWN: StretchEntry[] = CATALOG_DEFAULT_COOL_DOWN.map(
  (e) => ({ ...e }),
);
