"use client";

import SurfaceCard from "@/components/common/SurfaceCard";
import type { FrozenPastDayPlanCopy } from "@/lib/trainingWeekFrozenDay";

export default function FrozenPastDayPlanNotice({
  copy,
}: {
  copy: FrozenPastDayPlanCopy;
}) {
  return (
    <SurfaceCard className="border-border/80 bg-background/60 px-4 py-3 space-y-2">
      <p className="text-sm text-muted leading-snug">{copy.frozenPlanMessage}</p>
      {copy.dislikedOnFrozenPlanMessage && (
        <p className="text-sm text-amber-400/90 leading-snug">
          {copy.dislikedOnFrozenPlanMessage}
        </p>
      )}
    </SurfaceCard>
  );
}
