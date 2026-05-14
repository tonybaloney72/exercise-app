"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { formatLocalDateKey } from "@/utils/localDateKey";

export default function SettingsPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { workoutHistory, loadHistory } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const setGuest = useAuthStore((s) => s.setGuest);
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-surface p-4 space-y-3"
      >
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
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="rounded-xl border border-border bg-surface p-4"
      >
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
