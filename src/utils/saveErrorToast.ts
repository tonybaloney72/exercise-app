import { toast } from "sonner";

function describeErr(err: unknown): string | undefined {
  if (err instanceof Error && err.message.trim()) return err.message;
  return undefined;
}

/** Global Sonner toast when a user-initiated persist fails. */
export function toastSaveError(label: string, err?: unknown): void {
  const detail = describeErr(err);
  toast.error(`Couldn't save ${label}`, {
    description: detail ?? "Check your connection and try again.",
  });
  if (err !== undefined) console.error(`[save] ${label}`, err);
}

/** Settings persisted but a dependent refresh (e.g. training week) failed. */
export function toastSavePartialWarning(label: string, err?: unknown): void {
  const detail = describeErr(err);
  toast.warning(`${label} saved`, {
    description:
      detail ??
      "Your change was saved, but the workout plan could not refresh. Try again later.",
  });
  if (err !== undefined) console.error(`[save] ${label} (refresh)`, err);
}
