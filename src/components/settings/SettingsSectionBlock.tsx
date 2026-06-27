import type { ReactNode } from "react";

/** Flat section heading for settings subpages (replaces nested collapsibles). */
export default function SettingsSectionBlock({
  title,
  hint,
  children,
  className = "flex flex-col gap-4",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {hint ? <p className="text-xs text-muted mt-0.5">{hint}</p> : null}
      </div>
      <div className={className}>{children}</div>
    </section>
  );
}
