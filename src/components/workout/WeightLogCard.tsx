"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SurfaceCard from "@/components/common/SurfaceCard";
import {
  formatWeightLb,
  getWeightForDate,
} from "@/lib/weightLog";
import { useWeightStore } from "@/stores/useWeightStore";

type Props = {
  dateKey: string;
};

export default function WeightLogCard({ dateKey }: Props) {
  const entries = useWeightStore((s) => s.entries);
  const load = useWeightStore((s) => s.load);
  const upsert = useWeightStore((s) => s.upsert);
  const todayEntry = useMemo(
    () => getWeightForDate(entries, dateKey),
    [entries, dateKey],
  );

  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setInput(
      todayEntry != null ? String(Math.round(todayEntry.weightLb * 10) / 10) : "",
    );
  }, [todayEntry?.weightLb, dateKey]);

  const lastOther = useMemo(() => {
    const sorted = [...entries]
      .filter((e) => e.date !== dateKey)
      .sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0];
  }, [entries, dateKey]);

  const handleSave = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error("Enter your weight in pounds.");
      return;
    }
    const weightLb = parseFloat(trimmed);
    if (!Number.isFinite(weightLb) || weightLb <= 0 || weightLb > 999) {
      toast.error("Enter a valid weight (1–999 lb).");
      return;
    }

    setSaving(true);
    try {
      await upsert(dateKey, weightLb);
      toast.success("Weight saved");
    } finally {
      setSaving(false);
    }
  }, [dateKey, input, upsert]);

  return (
    <SurfaceCard className="flex flex-col p-4 gap-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Body weight</h2>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">
          Log once per day to track trends in Progress.
        </p>
      </div>
      <div className="flex gap-2 items-end">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Weight in pounds</span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={999}
              step={0.1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 182.5"
              className="w-full rounded-xl border border-border bg-surface-hover px-3 py-2.5 pr-10 text-sm font-medium text-foreground tabular-nums outline-none focus:border-accent"
              aria-label="Weight in pounds"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              lb
            </span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {lastOther && (
        <p className="text-xs text-muted">
          Last logged: {formatWeightLb(lastOther.weightLb)} on {lastOther.date}
        </p>
      )}
    </SurfaceCard>
  );
}
