"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  clearClientTrace,
  formatClientTraceExport,
  getClientTraceEntries,
} from "@/lib/diagnostics/clientTrace";
import { getInstalledNativeApkBuildId } from "@/lib/nativeApkVersion";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { testNativeHealthBridge } from "@/lib/health/nativeHealth";

export default function DiagnosticLogSection() {
  const [entryCount, setEntryCount] = useState(() => getClientTraceEntries().length);
  const [busy, setBusy] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);

  const refreshCount = useCallback(() => {
    setEntryCount(getClientTraceEntries().length);
  }, []);

  async function buildExportText(): Promise<string> {
    const installedApkVersion = isNativePlatform()
      ? await getInstalledNativeApkBuildId()
      : null;
    return formatClientTraceExport({
      installedApkVersion,
    });
  }

  async function handleCopy() {
    setBusy(true);
    try {
      const text = await buildExportText();
      await navigator.clipboard.writeText(text);
      toast.success("Diagnostic log copied");
    } catch {
      toast.error("Could not copy diagnostic log");
    } finally {
      setBusy(false);
      refreshCount();
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    setBusy(true);
    try {
      const text = await buildExportText();
      await navigator.share({
        title: "MyExercise diagnostic log",
        text,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Could not share diagnostic log");
    } finally {
      setBusy(false);
      refreshCount();
    }
  }

  function handleClear() {
    clearClientTrace();
    refreshCount();
    toast.message("Diagnostic log cleared");
  }

  async function handleTestHealthBridge() {
    setBridgeBusy(true);
    try {
      const result = await testNativeHealthBridge();
      refreshCount();
      if (result.ok) {
        const availability =
          result.available === true
            ? "Health Connect available"
            : result.available === false
              ? `Health Connect unavailable${result.reason ? `: ${result.reason}` : ""}`
              : "availability unknown";
        toast.success(
          `Health bridge OK (plugin ${result.pluginVersion ?? "?"} · ${availability})`,
        );
      } else {
        toast.error(result.error ?? "Health bridge failed");
      }
    } finally {
      setBridgeBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted leading-relaxed">
        Recent app actions (GPS save, Health Connect, cloud sync) are recorded
        here. If something hangs, wait a few seconds, then copy or share this
        log when reporting a bug.
      </p>
      <p className="text-xs text-muted">
        {entryCount} event{entryCount === 1 ? "" : "s"} in buffer
      </p>
      {isNativePlatform() ? (
        <button
          type="button"
          disabled={bridgeBusy}
          onClick={() => void handleTestHealthBridge()}
          className="w-full rounded-xl border border-accent/30 bg-accent/10 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/50 disabled:opacity-50"
        >
          {bridgeBusy ? "Testing Health bridge…" : "Test Health bridge"}
        </button>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy || entryCount === 0}
          onClick={() => void handleCopy()}
          className="flex-1 rounded-xl border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
        >
          Copy log
        </button>
        <button
          type="button"
          disabled={busy || entryCount === 0}
          onClick={() => void handleShare()}
          className="flex-1 rounded-xl border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 disabled:opacity-50"
        >
          Share log
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleClear}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          Clear log
        </button>
      </div>
    </div>
  );
}
