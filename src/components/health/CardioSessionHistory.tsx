"use client";

import { useMemo, useState } from "react";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import EmptyState from "@/components/common/EmptyState";
import GpsRoutePolyline from "@/components/cardio/GpsRoutePolyline";
import { hasRenderableGpsRoute } from "@/lib/geo/gpsTrackPolyline";
import type { WorkoutLog } from "@/types";
import {
  buildCardioSessionDetailMetrics,
  buildCardioSessionRows,
  formatCardioHistoryDayLabel,
  formatCardioSessionQuickSummary,
  groupCardioSessionsByDay,
  type CardioSessionRow,
} from "@/utils/cardioProgressStats";

type Props = {
  history: WorkoutLog[];
  exerciseId: string;
};

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CardioSessionDetailSheet({
  session,
  open,
  onClose,
}: {
  session: CardioSessionRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const metrics = session ? buildCardioSessionDetailMetrics(session) : [];
  const routePoints = session?.gpsTrackPoints;
  const hasRoute =
    routePoints != null && hasRenderableGpsRoute(routePoints);

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      title={session ? formatCardioHistoryDayLabel(session.date) : ""}
      titleClassName="text-base"
      maxWidth="lg"
      bodyClassName="overflow-y-auto overscroll-contain px-4 pt-4 pb-4"
    >
      {session ? (
        <div className="flex flex-col gap-4">
          {metrics.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    {metric.label}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {hasRoute ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Route
              </p>
              <GpsRoutePolyline
                points={routePoints!}
                ariaLabel={`${session.label} GPS route`}
              />
            </div>
          ) : null}

          {session.notes?.trim() ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Notes
              </p>
              <p className="text-sm text-foreground italic">{session.notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </BottomSheetModal>
  );
}

export default function CardioSessionHistory({
  history,
  exerciseId,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const dayGroups = useMemo(() => {
    const rows = buildCardioSessionRows(history, exerciseId);
    return groupCardioSessionsByDay(rows);
  }, [history, exerciseId]);

  const selectedSession = useMemo(() => {
    if (!selectedKey) return null;
    for (const group of dayGroups) {
      const match = group.sessions.find((s) => s.sessionKey === selectedKey);
      if (match) return match;
    }
    return null;
  }, [dayGroups, selectedKey]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">History</h2>

      {dayGroups.length === 0 ? (
        <EmptyState
          title="No sessions in this range."
          className="rounded-xl border border-border bg-surface px-4 py-6 text-sm"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {dayGroups.map((group) => (
            <div key={group.date} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-muted">
                {group.dayLabel}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {group.sessions.map((session) => (
                  <li key={session.sessionKey}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(session.sessionKey)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {session.label}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatCardioSessionQuickSummary(session)}
                        </p>
                      </div>
                      <span className="shrink-0 text-muted">
                        <ChevronRightIcon />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <CardioSessionDetailSheet
        session={selectedSession}
        open={selectedKey != null}
        onClose={() => setSelectedKey(null)}
      />
    </section>
  );
}
