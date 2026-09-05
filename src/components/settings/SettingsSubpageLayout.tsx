"use client";

import type { ReactNode } from "react";
import BackNavLink from "@/components/common/BackNavLink";
import { routes } from "@/lib/appRoutes";

export default function SettingsSubpageLayout({
  title,
  hint,
  children,
  backHref,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  /**
   * Preferred parent when there is no history (e.g. deep link).
   * Otherwise Back uses history.back() so settings → training → templates
   * unwinds correctly.
   */
  backHref?: string;
}) {
  return (
    <div className="flex flex-col py-6 gap-5">
      <BackNavLink fallbackHref={backHref ?? routes.settings} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {hint ? <p className="text-sm text-muted mt-1">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
