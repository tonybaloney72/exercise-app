"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ensureCardioHealthReadAccess,
  fetchHeartRateAverage,
  importRecentCardioSessions,
  type ImportedCardioSession,
} from "@/lib/health";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { formatSecondsToMMSS } from "@/utils/time";
import type { CardioActivityKind } from "@/types";

type Props = {
  kind: CardioActivityKind;
  onImport: (session: ImportedCardioSession) => void;
};

export default function CardioHealthImport({ kind, onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ImportedCardioSession[] | null>(null);

  if (!isNativePlatform()) return null;

  async function handleLoad() {
    setLoading(true);
    try {
      const granted = await ensureCardioHealthReadAccess();
      if (!granted) {
        toast.error("Health Connect access was not granted.");
        return;
      }
      const imported = await importRecentCardioSessions(kind);
      if (imported.length === 0) {
        toast.message("No recent sessions found in Health Connect.");
        setSessions([]);
        return;
      }
      setSessions(imported);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not read Health Connect.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePick(session: ImportedCardioSession) {
    let enriched = session;
    try {
      const avgHeartRateBpm = await fetchHeartRateAverage(
        session.startDate,
        session.endDate,
      );
      if (avgHeartRateBpm != null) {
        enriched = { ...session, avgHeartRateBpm };
      }
    } catch {
      // HR is optional; still import distance/time/calories.
    }
    onImport(enriched);
    toast.success("Imported from Health Connect");
  }

  return (
    <div className="rounded-xl border border-border bg-surface-hover/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Health Connect</p>
          <p className="text-xs text-muted mt-0.5">
            Import distance, time, calories, and heart rate from a recent session.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleLoad()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
        >
          {loading ? "Loading…" : "Import"}
        </button>
      </div>
      {sessions && sessions.length > 0 ? (
        <ul className="space-y-1.5">
          {sessions.map((session) => {
            const labelParts = [
              session.startDate.toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              formatSecondsToMMSS(session.durationSeconds),
            ];
            if (session.distanceMi != null) labelParts.push(`${session.distanceMi} mi`);
            if (session.activeCaloriesKcal != null) {
              labelParts.push(`${session.activeCaloriesKcal} kcal`);
            }
            return (
              <li key={`${session.startDate.toISOString()}-${session.durationSeconds}`}>
                <button
                  type="button"
                  onClick={() => void handlePick(session)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-accent/40"
                >
                  <span className="font-medium text-foreground">
                    {labelParts.join(" · ")}
                  </span>
                  {session.sourceName ? (
                    <span className="mt-0.5 block text-muted">{session.sourceName}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {sessions && sessions.length === 0 ? (
        <p className="text-xs text-muted">No matching sessions in the last 48 hours.</p>
      ) : null}
    </div>
  );
}
