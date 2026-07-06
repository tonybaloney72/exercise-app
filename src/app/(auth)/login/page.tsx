"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackNavLink from "@/components/common/BackNavLink";
import AuthField from "@/components/auth/AuthField";
import AuthOrDivider from "@/components/auth/AuthOrDivider";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
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

  useEffect(() => {
    const urlError = params.get("error");
    if (urlError) {
      setError(humanizeAuthError(decodeURIComponent(urlError), "login"));
    }
  }, [params]);

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
    <div className="flex flex-col gap-3 sm:gap-5">
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
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Welcome back
        </h1>
        <p className="text-xs text-muted sm:text-sm">
          Log in to sync your progress.
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
          setError(humanizeAuthError(message, "login"));
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

      <div className="flex flex-col gap-1 text-center text-sm text-muted sm:gap-2 sm:text-xs">
        <p>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Forgot password?
          </Link>
        </p>
        <p>
          No account?{" "}
          <Link
            href={
              returnTo !== APP_HOME
                ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
                : "/signup"
            }
            className="text-accent hover:underline"
          >
            Create one
          </Link>
        </p>
        <p>
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-accent hover:underline">
            Terms
          </Link>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
