"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { workoutHistory, loadHistory } = useWorkoutStore();

  useEffect(() => {
    settings.loadSettings();
    loadHistory();
  }, [settings.loadSettings, loadHistory]);

  const handleExport = () => {
    const data = {
      settings: {
        currentPushUpMax: settings.currentPushUpMax,
        currentJogDistance: settings.currentJogDistance,
        currentJogBestTimeSeconds: settings.currentJogBestTimeSeconds,
        restBetweenRounds: settings.restBetweenRounds,
        weekStartDate: settings.weekStartDate,
        darkMode: settings.darkMode,
      },
      workoutHistory,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exercise-app-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Customize your experience</p>
      </div>

      {/* Workout preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-surface p-4"
      >
        <h2 className="text-sm font-semibold text-foreground mb-3">Workout</h2>
        <div>
          <label className="text-xs text-muted">Rest Between Rounds (seconds)</label>
          <div className="mt-2 flex gap-2">
            {[60, 75, 90, 120].map((val) => (
              <button
                key={val}
                onClick={() => settings.updateSettings({ restBetweenRounds: val })}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  settings.restBetweenRounds === val
                    ? "bg-accent text-white"
                    : "bg-surface-hover text-muted hover:text-foreground border border-border"
                }`}
              >
                {val}s
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Data management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-surface p-4 space-y-3"
      >
        <h2 className="text-sm font-semibold text-foreground">Data</h2>
        <button
          onClick={handleExport}
          className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
        >
          Export Data (JSON)
        </button>
        <p className="text-[10px] text-muted text-center">
          {workoutHistory.length} workout{workoutHistory.length !== 1 ? "s" : ""} saved locally
        </p>
      </motion.div>
    </div>
  );
}
