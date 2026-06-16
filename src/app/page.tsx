"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import { isCapacitorBundledBuild, isNativePlatform } from "@/lib/capacitorRuntime";
import { setGuestCookieActive } from "@/lib/auth/guestCookieClient";

export default function LandingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGuest = useAuthStore((s) => s.setGuest);

  async function continueAsGuest() {
    setBusy(true);
    setError(null);
    try {
      if (isCapacitorBundledBuild() || isNativePlatform()) {
        setGuestCookieActive();
        setGuest(true);
        router.push("/today");
        return;
      }
      const res = await fetch(resolveApiUrl("/api/auth/guest"), { method: "POST" });
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
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-start px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center sm:py-10 sm:pb-10">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-center">
            <Image
              src="/branding/ME_Logo_Simple.png"
              alt=""
              width={240}
              height={96}
              className="h-auto w-[min(200px,70vw)] object-contain sm:w-[min(280px,85vw)]"
              priority
              aria-hidden
            />
          </div>
          <h1 className="text-center text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            MyExercise
          </h1>
          <p className="text-center text-lg font-semibold leading-snug text-foreground sm:text-xl">
            Train every day, build the habit.
          </p>
          <p className="text-center text-xs leading-snug text-muted sm:text-sm">
            A pocket coach for daily strength, cardio, and recovery - built for
            consistency over intensity.
          </p>
        </div>

        <div className="mt-4 space-y-2 sm:mt-8 sm:space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-xl bg-accent py-3 text-center text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60 sm:py-4"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="block w-full rounded-xl border border-transparent py-3 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent/10 sm:py-3.5"
          >
            Create account
          </Link>

          <div className="my-2 flex items-center gap-3 sm:my-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-caption uppercase tracking-wider text-muted">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={continueAsGuest}
            disabled={busy}
            className="block w-full rounded-xl border border-border bg-surface py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover sm:py-3.5"
          >
            {busy ? "Loading…" : "Continue as guest"}
          </button>
          <Link
            href="/download/android"
            className="block w-full rounded-xl border border-border/80 py-3 text-center text-sm font-medium text-muted transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground sm:py-3.5"
          >
            Download Android app (APK)
          </Link>
          <p className="text-center text-caption leading-snug text-muted sm:text-sm">
            Guest mode keeps everything on this device - no account, no sync.
          </p>
          {error && (
            <p className="text-center text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-caption text-muted">
          <Link href="/download/android" className="hover:text-foreground">
            Android app
          </Link>
          <span aria-hidden className="mx-2">
            ·
          </span>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <span aria-hidden className="mx-2">
            ·
          </span>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
