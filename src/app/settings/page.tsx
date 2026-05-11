"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { parseTimeInput, formatSecondsToMMSS } from "@/utils/time";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { workoutHistory, loadHistory } = useWorkoutStore();

  const [pushUpInput, setPushUpInput] = useState("");
  const [jogDistInput, setJogDistInput] = useState("");
  const [jogTimeInput, setJogTimeInput] = useState("");

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

      {/* Progression tracking */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-surface divide-y divide-border"
      >
        <div className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Progression</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted">Push-Up Max (knee)</label>
              <input
                type="text"
                inputMode="numeric"
                value={pushUpInput || (settings.currentPushUpMax != null ? String(settings.currentPushUpMax) : "")}
                onChange={(e) => setPushUpInput(e.target.value)}
                onBlur={() => {
                  const val = pushUpInput.trim();
                  if (val === "") {
                    settings.updateSettings({ currentPushUpMax: undefined });
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) settings.updateSettings({ currentPushUpMax: num });
                  }
                  setPushUpInput("");
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                placeholder="13"
              />
            </div>

            <div>
              <label className="text-xs text-muted">Current Jog Distance (miles)</label>
              <input
                type="text"
                inputMode="decimal"
                value={jogDistInput || (settings.currentJogDistance != null ? String(settings.currentJogDistance) : "")}
                onChange={(e) => setJogDistInput(e.target.value)}
                onBlur={() => {
                  const val = jogDistInput.trim();
                  if (val === "") {
                    settings.updateSettings({ currentJogDistance: undefined });
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) settings.updateSettings({ currentJogDistance: num });
                  }
                  setJogDistInput("");
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                placeholder="1.3"
              />
            </div>

            <div>
              <label className="text-xs text-muted">Best Jog Time (MM:SS)</label>
              <input
                type="text"
                inputMode="numeric"
                value={jogTimeInput || formatSecondsToMMSS(settings.currentJogBestTimeSeconds)}
                onChange={(e) => setJogTimeInput(e.target.value)}
                onBlur={() => {
                  const parsed = parseTimeInput(jogTimeInput);
                  settings.updateSettings({ currentJogBestTimeSeconds: parsed });
                  setJogTimeInput("");
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                placeholder="17:35"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Workout preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
        transition={{ delay: 0.1 }}
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
