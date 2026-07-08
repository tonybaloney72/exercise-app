"use client";

import { useEffectiveDarkMode } from "@/hooks/useEffectiveDarkMode";
import {
  FATSECRET_BADGE_ALT,
  FATSECRET_BADGE_DARK_SRC,
  FATSECRET_BADGE_WHITE_SRC,
  FATSECRET_PLATFORM_URL,
} from "@/lib/nutrition/fatsecretAttribution";

type Props = {
  className?: string;
};

/** Theme-aware FatSecret web badge for in-app nutrition screens. */
export default function FatSecretAttributionBadge({ className }: Props) {
  const isDark = useEffectiveDarkMode();

  return (
    <div className={className}>
      <a
        href={FATSECRET_PLATFORM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          alt={FATSECRET_BADGE_ALT}
          src={isDark ? FATSECRET_BADGE_WHITE_SRC : FATSECRET_BADGE_DARK_SRC}
          className="h-6 w-auto max-w-full"
        />
      </a>
    </div>
  );
}
