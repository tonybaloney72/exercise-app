"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackNavLink from "@/components/common/BackNavLink";
import AuthField from "@/components/auth/AuthField";
import AuthOrDivider from "@/components/auth/AuthOrDivider";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { humanizeAuthError } from "@/lib/auth/humanizeAuthError";
import { createClient } from "@/lib/supabase/client";
import { APP_HOME, safeReturnTo } from "@/lib/auth/constants";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));

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
      setError(humanizeAuthError(error.message, "signup"));
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
    router.push(returnTo || APP_HOME);
  }

  const loginHref =
    returnTo !== APP_HOME
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : "/login";

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Create account</h1>
        <p className="text-xs text-muted sm:text-sm">
          Sync your workouts across devices.
        </p>
      </div>

      <GoogleSignInButton
        returnTo={returnTo}
        disabled={busy}
        onStart={() => {
          setBusy(true);
          setError(null);
        }}
        onError={(message) => {
          setError(humanizeAuthError(message, "signup"));
          setBusy(false);
        }}
      />

      <AuthOrDivider />

      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={setPassword}
          hint="At least 8 characters"
        />
        <AuthField
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

      <div className="flex flex-col gap-1 text-center text-sm text-muted sm:gap-2 sm:text-xs">
        <p>
          Already have an account?{" "}
          <Link href={loginHref} className="text-accent hover:underline">
            Log in
          </Link>
        </p>
        <p>
          <BackNavLink fallbackHref="/" className="text-sm text-muted hover:text-foreground" />
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
