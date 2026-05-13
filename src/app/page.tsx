"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/useAuthStore";

export default function LandingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGuest = useAuthStore((s) => s.setGuest);

  async function continueAsGuest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start guest session.");
      setGuest(true);
      router.refresh();
      router.push("/today");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1">
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-accent">
            Exercise App
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Train every day, build the habit.
          </h1>
          <p className="text-sm text-muted">
            A pocket coach for daily strength, cardio, and recovery — built for
            consistency over intensity.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-8 space-y-3"
        >
          <button
            onClick={continueAsGuest}
            disabled={busy}
            className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Loading…" : "Continue as guest"}
          </button>
          <p className="text-center text-[11px] text-muted">
            Guest mode keeps everything on this device — no account, no sync.
          </p>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Link
            href="/login"
            className="block w-full rounded-xl border border-border bg-surface py-3.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="block w-full rounded-xl border border-transparent py-3.5 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Create account
          </Link>

          {error && (
            <p className="text-center text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}
