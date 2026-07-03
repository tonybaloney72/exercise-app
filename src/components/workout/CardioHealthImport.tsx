"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ensureCardioHealthReadAccess,
  enrichImportedSessionWithRoute,
  fetchCardioHealthMetricsForWindow,
  importRecentCardioSessions,
  openNativeHealthSettings,
  type ImportedCardioSession,
} from "@/lib/health";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { formatSecondsToMMSS } from "@/utils/time";
import type { CardioActivityKind } from "@/types";

type Props = {
  kind: CardioActivityKind;
  onImport: (session: ImportedCardioSession) => void;
};

export default function CardioHealthImport({ kind, onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ImportedCardioSession[] | null>(
    null,
  );

  if (!isNativePlatform()) return null;

  async function handleLoad() {
    setLoading(true);
    clientTrace("health-import", "import_click", { kind });
    try {
      const granted = await ensureCardioHealthReadAccess();
      clientTrace("health-import", "import_auth", { granted });
      if (!granted) {
        toast.error(
          "Health Connect did not respond or access was denied. Try opening Health Connect settings.",
        );
        return;
      }
      const imported = await importRecentCardioSessions(kind);
      clientTrace("health-import", "import_sessions", {
        count: imported.length,
      });
      if (imported.length === 0) {
        toast.message(
          "No matching sessions in Health Connect. Try Start/End to pull data from your activity window.",
        );
        setSessions([]);
        return;
      }
      setSessions(imported);
    } catch (err) {
      clientTrace(
        "health-import",
        "import_error",
        { message: err instanceof Error ? err.message : String(err) },
        "error",
      );
      toast.error(
        err instanceof Error ? err.message : "Could not read Health Connect.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePick(session: ImportedCardioSession) {
    clientTrace("health-import", "pick_session", {
      durationSeconds: session.durationSeconds,
      distanceMi: session.distanceMi,
      platformId: session.platformId,
    });
    let enriched = session;
    try {
      const metrics = await fetchCardioHealthMetricsForWindow(
        session.startDate,
        session.endDate,
        {
          activeCaloriesKcal: session.activeCaloriesKcal,
          healthSourceName: session.sourceName,
        },
      );
      enriched = {
        ...session,
        stepCount: metrics.stepCount,
        activeCaloriesKcal:
          metrics.activeCaloriesKcal ?? session.activeCaloriesKcal,
        avgHeartRateBpm: metrics.avgHeartRateBpm,
      };
    } catch {
      // Steps/HR are optional; still import distance/time/calories.
    }
    try {
      enriched = await enrichImportedSessionWithRoute(enriched);
    } catch {
      // Route is optional; summary fields still import.
    }
    onImport(enriched);
    toast.success(
      enriched.gpsTrack && enriched.gpsTrack.length >= 2
        ? "Imported from Health Connect with route"
        : "Imported from Health Connect",
    );
  }

  async function handleOpenSettings() {
    const opened = await openNativeHealthSettings();
    if (!opened) {
      toast.error(
        "Could not open Health Connect. Try Settings → Apps → Health Connect → App permissions.",
      );
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Health Connect</p>
          <p className="text-xs text-muted mt-0.5">
            Import a session from the last 48 hours if you forgot to track live.
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
      <button
        type="button"
        onClick={() => void handleOpenSettings()}
        className="text-xs font-medium text-accent hover:underline"
      >
        Open Health Connect settings
      </button>
      {sessions && sessions.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
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
            if (session.distanceMi != null)
              labelParts.push(`${session.distanceMi} mi`);
            if (session.activeCaloriesKcal != null) {
              labelParts.push(`${session.activeCaloriesKcal} kcal`);
            }
            return (
              <li
                key={`${session.startDate.toISOString()}-${session.durationSeconds}`}
              >
                <button
                  type="button"
                  onClick={() => void handlePick(session)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs hover:border-accent/40"
                >
                  <span className="font-medium text-foreground">
                    {labelParts.join(" · ")}
                  </span>
                  {session.workoutType ? (
                    <span className="mt-0.5 block text-muted capitalize">
                      {session.sourceName
                        ? `${session.workoutType} · ${session.sourceName}`
                        : session.workoutType}
                    </span>
                  ) : session.sourceName ? (
                    <span className="mt-0.5 block text-muted">
                      {session.sourceName}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {sessions && sessions.length === 0 ? (
        <p className="text-xs text-muted">
          No matching sessions in the last 48 hours.
        </p>
      ) : null}
    </div>
  );
}
