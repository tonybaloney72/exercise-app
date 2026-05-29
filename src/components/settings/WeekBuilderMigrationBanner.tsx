"use client";

import Link from "next/link";
import SurfaceCard from "@/components/common/SurfaceCard";

type Props = {
  onDismiss: () => void;
};

export default function WeekBuilderMigrationBanner({ onDismiss }: Props) {
  return (
    <SurfaceCard className="border-accent/30 bg-accent/5 p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Workout generation has changed
        </p>
        <p className="text-sm text-muted leading-snug">
          Weekly layout mode is retired. Open{" "}
          <strong className="text-foreground">Your week</strong> below to choose{" "}
          <strong className="text-foreground">PPL</strong> or{" "}
          <strong className="text-foreground">Custom</strong> (guided or manual).
          If you used Weekly layout, your week was converted to a guided blueprint
          — the full week editor arrives in a later update.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="#your-week-settings"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Go to Your week
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </SurfaceCard>
  );
}
