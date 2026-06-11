import Link from "next/link";
import BackNavLink from "@/components/common/BackNavLink";

export function ProgressBackLink({
  label = "Back",
  fallbackHref = "/progress",
}: {
  label?: string;
  fallbackHref?: string;
} = {}) {
  return <BackNavLink label={label} fallbackHref={fallbackHref} />;
}

export function ProgressHistoryLink() {
  return (
    <Link
      href="/progress/history"
      className="inline-flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-surface-hover"
    >
      <span>History</span>
      <span className="text-muted" aria-hidden>
        →
      </span>
    </Link>
  );
}
