"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_HOME } from "@/lib/auth/constants";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(humanize(error.message));
      setBusy(false);
      return;
    }

    // With email confirmations disabled, signUp returns a session immediately.
    if (!data.session) {
      setError(
        "Account created, but no session was returned. Try logging in.",
      );
      setBusy(false);
      return;
    }

    router.refresh();
    router.push(APP_HOME);
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Create account</h1>
        <p className="text-xs text-muted sm:text-sm">
          Sync your workouts across devices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={setPassword}
          hint="At least 8 characters"
        />
        <Field
          id="confirm"
          label="Confirm password"
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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="space-y-1 text-center text-[11px] text-muted sm:space-y-2 sm:text-xs">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
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

function Field({
  id,
  label,
  type,
  autoComplete,
  required,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted sm:px-4 sm:py-3"
      />
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function humanize(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("already registered") || lower.includes("user already"))
    return "An account with that email already exists. Try logging in.";
  if (lower.includes("password should be"))
    return "Password is too short. Use at least 8 characters.";
  if (lower.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  return msg;
}
