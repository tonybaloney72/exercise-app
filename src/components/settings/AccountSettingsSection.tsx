"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import SettingsLegalLinks from "@/components/settings/SettingsLegalLinks";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import {
  isCapacitorBundledBuild,
  isNativePlatform,
} from "@/lib/capacitorRuntime";
import { clearGuestCookie } from "@/lib/auth/guestCookieClient";

export default function AccountSettingsSection() {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const setGuest = useAuthStore((s) => s.setGuest);

  async function handleSignOut() {
    await fetch(resolveApiUrl("/api/auth/signout"), { method: "POST" });
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  async function handleExitGuest() {
    if (isCapacitorBundledBuild() || isNativePlatform()) {
      clearGuestCookie();
    } else {
      await fetch(resolveApiUrl("/api/auth/guest"), { method: "DELETE" });
    }
    setGuest(false);
    router.refresh();
    router.push("/");
  }

  return (
    <CollapsibleSection
      title="Account"
      defaultOpen
      contentClassName="flex flex-col gap-3 p-4"
    >
      {mode === "authenticated" && user && (
        <>
          <div>
            <p className="text-xs text-muted">Signed in as</p>
            <p className="text-sm text-foreground break-all">{user.email}</p>
          </div>
          <ChangePasswordSection email={user.email ?? ""} />
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
          >
            Sign out
          </button>
          <DeleteAccountSection />
          <SettingsLegalLinks />
        </>
      )}

      {mode === "guest" && (
        <>
          <div>
            <p className="text-xs text-muted">Mode</p>
            <p className="text-sm text-foreground">
              Guest - data is stored on this device only.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-border bg-surface-hover py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-border/50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-accent/90"
            >
              Create account
            </Link>
          </div>
          <button
            onClick={handleExitGuest}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
          >
            Exit guest mode
          </button>
          <SettingsLegalLinks />
        </>
      )}

      {(mode === "loading" || mode === "anonymous") && (
        <p className="text-xs text-muted">Loading account…</p>
      )}
    </CollapsibleSection>
  );
}

function ChangePasswordSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("New password must be different from your current one.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setError("Current password is incorrect.");
      setBusy(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    setSuccess(true);
    setBusy(false);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="w-full rounded-lg border border-border bg-surface-hover py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-border/50"
      >
        Change password
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-t border-border py-3"
    >
      <PasswordField
        id="current-password"
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
      />
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        hint="At least 8 characters"
      />
      <PasswordField
        id="confirm-new-password"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
      />

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-400" role="status">
          Password updated.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="flex-1 rounded-lg border border-border bg-surface-hover py-2 text-sm font-medium text-muted transition-colors hover:bg-border/50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted"
      />
      {hint && <p className="text-caption text-muted">{hint}</p>}
    </div>
  );
}
