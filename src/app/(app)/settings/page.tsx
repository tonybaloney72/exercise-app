"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AnimatedSection from "@/components/common/AnimatedSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import { useSettingsStore } from "@/stores/useSettingsStore";
import DefaultStretchesModal from "@/components/settings/DefaultStretchesModal";
import EquipmentPicker from "@/components/settings/EquipmentPicker";
import { buildStretchResolveContext } from "@/lib/stretchResolveContext";
import { ROUND_DENSITY_OPTIONS } from "@/lib/programProfile";
import { TRAINING_PRIORITY_OPTIONS } from "@/lib/trainingPriorities";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { createClient } from "@/lib/supabase/client";
import { formatLocalDateKey } from "@/utils/localDateKey";

export default function SettingsPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { workoutHistory, loadHistory } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const setGuest = useAuthStore((s) => s.setGuest);
  const [stretchModalOpen, setStretchModalOpen] = useState(false);

  const exercisePrefs = useExercisePreferencesStore((s) => s.byExerciseId);

  const effectiveStretchDefaults = useMemo(() => {
    if (!settings.hydrated) return { warm: 0, cool: 0 };
    const ctx = buildStretchResolveContext();
    return {
      warm: ctx.defaultWarmUp.length,
      cool: ctx.defaultCoolDown.length,
    };
  }, [
    settings.hydrated,
    settings.defaultWarmUp,
    settings.defaultCoolDown,
    settings.availableEquipment,
    exercisePrefs,
  ]);
  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  const handleExport = () => {
    const data = {
      settings: {
        restBetweenRounds: settings.restBetweenRounds,
        weekStartDate: settings.weekStartDate,
        darkMode: settings.darkMode,
        restTimerAutoStart: settings.restTimerAutoStart,
        timerSoundsEnabled: settings.timerSoundsEnabled,
        timerVibrationEnabled: settings.timerVibrationEnabled,
        keepScreenAwake: settings.keepScreenAwake,
        availableEquipment: settings.availableEquipment,
        trainingPriorityPreset: settings.trainingPriorityPreset,
        roundDensity: settings.roundDensity,
        defaultWarmUp: settings.defaultWarmUp,
        defaultCoolDown: settings.defaultCoolDown,
      },
      workoutHistory,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exercise-app-backup-${formatLocalDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  async function handleExitGuest() {
    await fetch("/api/auth/guest", { method: "DELETE" });
    setGuest(false);
    router.refresh();
    router.push("/");
  }

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">Customize your experience</p>
      </div>

      {/* Account */}
      <AnimatedSection>
        <SurfaceCard className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>

        {mode === "authenticated" && user && (
          <>
            <div>
              <p className="text-xs text-muted">Signed in as</p>
              <p className="text-sm text-foreground break-all">{user.email}</p>
            </div>
            <ChangePasswordSection email={user.email ?? ""} />
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
            >
              Sign out
            </button>
          </>
        )}

        {mode === "guest" && (
          <>
            <div>
              <p className="text-xs text-muted">Mode</p>
              <p className="text-sm text-foreground">
                Guest — data is stored on this device only.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-border bg-surface-hover py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-border/50"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-accent py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-accent/90"
              >
                Create account
              </Link>
            </div>
            <button
              onClick={handleExitGuest}
              className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
            >
              Exit guest mode
            </button>
          </>
        )}

        {(mode === "loading" || mode === "anonymous") && (
          <p className="text-xs text-muted">Loading account…</p>
        )}
        </SurfaceCard>
      </AnimatedSection>

      {/* Appearance */}
      <AnimatedSection delay={0.04}>
        <SurfaceCard className="p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Appearance</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Dark mode</p>
            <p className="text-xs text-muted mt-0.5">
              Turn off for a light background across the app
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.darkMode}
            onClick={() => settings.updateSettings({ darkMode: !settings.darkMode })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              settings.darkMode ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                settings.darkMode ? "translate-x-6" : "translate-x-0"
              }`}
            />
            <span className="sr-only">{settings.darkMode ? "On" : "Off"}</span>
          </button>
        </div>
        </SurfaceCard>
      </AnimatedSection>

      {/* Timers & device */}
      <AnimatedSection delay={0.045}>
        <SurfaceCard className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Timers &amp; device</h2>
        <div>
          <h3 className="text-xs font-semibold text-foreground">
            Rest between rounds
          </h3>
          <p className="text-xs text-muted mt-0.5 mb-2">
            Default countdown length when you start a rest timer.
          </p>
          <div className="flex gap-2" role="group" aria-label="Rest between rounds in seconds">
            {[60, 75, 90, 120].map((val) => (
              <button
                key={val}
                type="button"
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
        <SettingsSwitch
          title="Auto-start rest timer"
          description="When you finish a round, open the rest countdown immediately. Turn off to tap Start rest on the round card instead."
          checked={settings.restTimerAutoStart}
          onChange={() =>
            settings.updateSettings({
              restTimerAutoStart: !settings.restTimerAutoStart,
            })
          }
        />
        <SettingsSwitch
          title="Timer sounds"
          description="Play a short chime when a set timer, rest timer, or similar countdown finishes."
          checked={settings.timerSoundsEnabled}
          onChange={() =>
            settings.updateSettings({
              timerSoundsEnabled: !settings.timerSoundsEnabled,
            })
          }
        />
        <SettingsSwitch
          title="Timer & exercise vibration"
          description="Brief vibration when a timer finishes or you mark an exercise complete (if your device supports it)."
          checked={settings.timerVibrationEnabled}
          onChange={() =>
            settings.updateSettings({
              timerVibrationEnabled: !settings.timerVibrationEnabled,
            })
          }
        />
        <SettingsSwitch
          title="Keep screen on"
          description="Try to prevent the screen from dimming while this app is open. Rest and set timers also keep the screen awake while running. Countdowns stay accurate if the phone locks (wall-clock sync)."
          checked={settings.keepScreenAwake}
          onChange={() =>
            settings.updateSettings({
              keepScreenAwake: !settings.keepScreenAwake,
            })
          }
        />
        </SurfaceCard>
      </AnimatedSection>

      {/* Equipment */}
      <AnimatedSection delay={0.048}>
        <SurfaceCard className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Your equipment</h2>
          <p className="text-xs text-muted mt-1">
            The library hides exercises that need gear you don&apos;t have. When signed in,
            changing equipment updates this week&apos;s prescribed plan (finished workouts
            stay as logged). Based on the{" "}
            <a
              href="https://www.hybridcalisthenics.com/exercise-library"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Hybrid Calisthenics
            </a>{" "}
            exercise reference.
          </p>
        </div>
        <EquipmentPicker
          selected={settings.availableEquipment}
          onChange={(next) => void settings.updateSettings({ availableEquipment: next })}
        />
        </SurfaceCard>
      </AnimatedSection>

      {/* Training priorities (signed-in weekly plans) */}
      {mode === "authenticated" && (
        <AnimatedSection delay={0.049}>
          <SurfaceCard className="p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Training priorities</h2>
            <p className="text-xs text-muted mt-1">
              Chooses how much core, cardio, legs, and upper body appear when your week
              is generated. Each day still follows the weekly template. Updates today
              and upcoming days; finished workouts stay as logged.
            </p>
          </div>
          <div className="space-y-2" role="radiogroup" aria-label="Training priority preset">
            {TRAINING_PRIORITY_OPTIONS.map((option) => {
              const selected = settings.trainingPriorityPreset === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() =>
                    void settings.updateSettings({
                      trainingPriorityPreset: option.value,
                    })
                  }
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-hover hover:border-accent/30"
                  }`}
                >
                  <span
                    className={`block text-sm font-medium ${
                      selected ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Round density</h3>
            <p className="text-xs text-muted mt-0.5 mb-2">
              How many exercises per round when your week is generated.
            </p>
            <div className="space-y-2" role="radiogroup" aria-label="Round density">
              {ROUND_DENSITY_OPTIONS.map((option) => {
                const selected = settings.roundDensity === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      void settings.updateSettings({ roundDensity: option.value })
                    }
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-hover hover:border-accent/30"
                    }`}
                  >
                    <span
                      className={`block text-sm font-medium ${
                        selected ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">Default stretches</h3>
            <p className="text-xs text-muted mt-0.5 mb-2">
              Stretches you always want included when a day&apos;s warm-up or cool-down is
              built. Start empty and add your own; disliked Library exercises are excluded.
            </p>
            <p className="text-xs text-foreground mb-2">
              {effectiveStretchDefaults.warm === 0 && effectiveStretchDefaults.cool === 0
                ? "None selected — focus-based stretches still apply per day."
                : `${effectiveStretchDefaults.warm} warm-up · ${effectiveStretchDefaults.cool} cool-down`}
            </p>
            <button
              type="button"
              onClick={() => setStretchModalOpen(true)}
              className="w-full rounded-xl border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
            >
              Edit default stretches
            </button>
          </div>
          </SurfaceCard>
        </AnimatedSection>
      )}

      <DefaultStretchesModal
        open={stretchModalOpen}
        onClose={() => setStretchModalOpen(false)}
      />

      {/* Data management */}
      <AnimatedSection delay={0.1}>
        <SurfaceCard className="p-4 space-y-3">
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
        </SurfaceCard>
      </AnimatedSection>
    </div>
  );
}

function SettingsSwitch({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          checked ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

function ChangePasswordSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("New password must be different from your current one.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // Reauthenticate by signing in with the provided current password.
    // Supabase doesn't ship a dedicated reauth API for email/password.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setError("Current password is incorrect.");
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    setSuccess(true);
    setBusy(false);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
      >
        Change password
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t border-border pt-3">
      <PasswordField
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
      />
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        hint="At least 8 characters"
      />
      <PasswordField
        id="confirm-new-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
      />

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-400" role="status">
          Password updated.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="flex-1 rounded-lg border border-border bg-surface-hover py-2 text-sm font-medium text-muted transition-colors hover:bg-border/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[11px] font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
      />
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}
