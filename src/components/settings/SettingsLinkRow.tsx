import Link from "next/link";

export default function SettingsLinkRow({
  href,
  title,
  hint,
}: {
  href: string;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted mt-0.5">{hint}</p>
      </div>
      <span className="shrink-0 text-muted" aria-hidden>
        →
      </span>
    </Link>
  );
}
