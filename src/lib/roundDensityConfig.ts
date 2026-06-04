import type { RoundDensity } from "@/types";

export const ROUND_DENSITY_TARGETS: Record<RoundDensity, number> = {
  compact: 3,
  standard: 5,
  full: 7,
};

export type RoundDensityOption = {
  value: RoundDensity;
  label: string;
  description: string;
};

export const ROUND_DENSITY_OPTIONS: RoundDensityOption[] = [
  {
    value: "compact",
    label: "Compact",
    description: "About 3 exercises per round — shorter sessions.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "About 5 exercises per round — matches the default templates.",
  },
  {
    value: "full",
    label: "Full",
    description:
      "About 7 exercises per round — longer rounds when equipment allows.",
  },
];
