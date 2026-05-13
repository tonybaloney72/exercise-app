"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_HOME, safeReturnTo } from "@/lib/auth/constants";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(humanize(error.message));
      setBusy(false);
      return;
    }

    router.refresh();
    router.push(returnTo || APP_HOME);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted">Log in to sync your progress.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
        />

        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>

      <div className="space-y-2 text-center text-xs text-muted">
        <p>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Forgot password?
          </Link>
        </p>
        <p>
          No account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Create one
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
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
}: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
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
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
      />
    </div>
  );
}

function humanize(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials"))
    return "That email and password don't match. Try again.";
  if (lower.includes("email not confirmed"))
    return "Please confirm your email address before logging in.";
  if (lower.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  return msg;
}
