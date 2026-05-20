import Link from "next/link";

const LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function ProgressBackLink({
  href = "/progress",
  label = "Back to Progress",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className={LINK_CLASS}>
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
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
