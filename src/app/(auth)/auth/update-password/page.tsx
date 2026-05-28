"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthField from "@/components/auth/AuthField";
import { humanizeAuthError } from "@/lib/auth/humanizeAuthError";
import { createClient } from "@/lib/supabase/client";
import { APP_HOME } from "@/lib/auth/constants";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(humanizeAuthError(error.message, "password"));
      setBusy(false);
      return;
    }

    // Recovery session is already active — drop straight into the app.
    router.refresh();
    router.push(APP_HOME);
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Set a new password</h1>
        <p className="text-xs text-muted sm:text-sm">
          Choose something you&apos;ll remember.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
        <AuthField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={setPassword}
          hint="At least 8 characters"
        />
        <AuthField
          id="confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={setConfirm}
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
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>

      <p className="text-center text-sm text-muted sm:text-xs">
        Link expired or not working?{" "}
        <Link href="/forgot-password" className="text-accent hover:underline">
          Request a new one
        </Link>
      </p>
    </div>
  );
}
