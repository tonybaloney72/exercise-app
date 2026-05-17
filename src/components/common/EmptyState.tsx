import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Simple emoji or inline SVG shown above the title. */
  icon?: ReactNode;
  action?: { label: string; href: string };
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 text-center ${className}`.trim()}
      role="status"
    >
      {icon ? (
        <span className="text-3xl leading-none" aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted max-w-xs mx-auto">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="mt-1 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-colors hover:bg-accent/90 active:scale-[0.98]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
