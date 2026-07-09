"use client";

import SurfaceCard from "@/components/common/SurfaceCard";
import type { HealthRecordLogEntry } from "@/lib/health/healthTodayDetail";

type Props = {
  title?: string;
  entries: HealthRecordLogEntry[];
  emptyDetail: string;
};

export default function HealthRecordLogList({
  title = "Today's logs",
  entries,
  emptyDetail,
}: Props) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{emptyDetail}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {entry.timeLabel}
                </p>
                {entry.sourceName ? (
                  <p className="mt-0.5 text-xs text-muted">{entry.sourceName}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm tabular-nums text-foreground">
                {entry.detailLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
