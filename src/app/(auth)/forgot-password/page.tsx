"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    // `next` is honored by /auth/callback after code exchange.
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center sm:space-y-4">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Check your email</h1>
        <p className="text-xs leading-snug text-muted sm:text-sm">
          If an account exists for <span className="text-foreground">{email}</span>,
          we sent instructions to reset your password.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Reset password</h1>
        <p className="text-xs text-muted sm:text-sm">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted sm:px-4 sm:py-3"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60 sm:py-3.5"
        >
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="space-y-1 text-center text-[11px] text-muted sm:space-y-2 sm:text-xs">
        <p>
          <Link href="/login" className="text-accent hover:underline">
            Back to log in
          </Link>
        </p>
        <p>
          <Link href="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
