import type { CardioActivityKind } from "@/types";
import { CARDIO_ACTIVITY_LABELS } from "@/lib/cardioActivities";

/** Progress stat card label for lifetime distance on a cardio kind. */
export function totalMilesCardioStatLabel(kind: CardioActivityKind): string {
  switch (kind) {
    case "jog":
      return "Total Miles Jogged";
    case "walk":
      return "Total Miles Walked";
    case "cycle":
      return "Total Miles Cycled";
    case "hike":
      return "Total Miles Hiked";
    case "swim":
      return "Total Miles Swum";
    case "treadmill":
    case "elliptical":
    case "indoor_bike":
    case "row":
    case "stairs":
      return `Total Miles ${CARDIO_ACTIVITY_LABELS[kind]}`;
  }
}
