"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BottomSheetModal from "@/components/common/BottomSheetModal";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export default function DeleteAccountSection() {
  const router = useRouter();
  const resetAuth = useAuthStore((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        toast.error(body.error ?? "Could not delete account.");
        setBusy(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      resetAuth();
      setOpen(false);
      router.refresh();
      router.push("/");
      toast.success("Your account was deleted. Sorry to see you go!");
    } catch (err) {
      console.error("[DeleteAccountSection]", err);
      toast.error("Could not delete account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
      >
        Delete account
      </button>

      <BottomSheetModal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Delete account?"
        hint="This cannot be undone."
        ariaLabel="Confirm account deletion"
        closeOnBackdropClick={!busy}
        closeOnEscape={!busy}
        bodyClassName="space-y-3 px-4 py-4"
        footer={
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={busy}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete account"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          Permanently delete your account and all synced data on our servers,
          including workouts, settings, preferences, and saved week plans.
        </p>
        <p className="text-sm text-muted">
          You will be signed out immediately. This action cannot be reversed.
        </p>
      </BottomSheetModal>
    </>
  );
}
