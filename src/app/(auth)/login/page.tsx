"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackNavLink from "@/components/common/BackNavLink";
import AuthField from "@/components/auth/AuthField";
import { humanizeAuthError } from "@/lib/auth/humanizeAuthError";
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
      setError(humanizeAuthError(error.message, "login"));
      setBusy(false);
      return;
    }

    router.refresh();
    router.push(returnTo || APP_HOME);
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex justify-center">
        <Image
          src="/branding/ME_Logo_Simple.png"
          alt="MyExercise"
          width={240}
          height={96}
          className="h-auto w-[min(200px,70vw)] object-contain sm:w-[min(280px,85vw)]"
          priority
        />
      </div>
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Welcome back</h1>
        <p className="text-xs text-muted sm:text-sm">Log in to sync your progress.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          showPasswordToggle
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
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>

      <div className="space-y-1 text-center text-sm text-muted sm:space-y-2 sm:text-xs">
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
          <BackNavLink label="Back" fallbackHref="/" className="text-sm text-muted hover:text-foreground" />
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
