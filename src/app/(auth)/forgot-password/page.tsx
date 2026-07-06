"use client";

import { useState } from "react";
import BackNavLink from "@/components/common/BackNavLink";
import AuthField from "@/components/auth/AuthField";
import { humanizeAuthError } from "@/lib/auth/humanizeAuthError";
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
      setError(humanizeAuthError(error.message, "reset"));
      setBusy(false);
      return;
    }

    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3 text-center sm:gap-4">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Check your email</h1>
        <p className="text-xs leading-snug text-muted sm:text-sm">
          If an account exists for <span className="text-foreground">{email}</span>,
          we sent instructions to reset your password.
        </p>
        <BackNavLink
          fallbackHref="/login"
          className="inline-block rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Reset password</h1>
        <p className="text-xs text-muted sm:text-sm">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />

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

      <div className="flex flex-col gap-1 text-center text-sm text-muted sm:gap-2 sm:text-xs">
        <p>
          <BackNavLink
            fallbackHref="/login"
            className="text-accent hover:underline"
          />
        </p>
        <p>
          <BackNavLink
            fallbackHref="/"
            className="text-sm text-muted hover:text-foreground"
          />
        </p>
      </div>
    </div>
  );
}
