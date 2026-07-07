"use client";

import Link from "next/link";

export type SectionHeaderTab = {
  id: string;
  label: string;
  href: string;
};

type SectionHeaderTabsProps = {
  tabs: readonly SectionHeaderTab[];
  activeId: string;
  hiddenTabIds?: readonly string[];
  ariaLabel: string;
  className?: string;
};

export default function SectionHeaderTabs({
  tabs,
  activeId,
  hiddenTabIds = [],
  ariaLabel,
  className = "",
}: SectionHeaderTabsProps) {
  const hidden = new Set(hiddenTabIds);
  const visible = tabs.filter((tab) => !hidden.has(tab.id));

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${className}`}
    >
      {visible.map((tab) => {
        const isActive = tab.id === activeId;
        if (isActive) {
          return (
            <span
              key={tab.id}
              className="text-2xl font-bold text-foreground"
              aria-current="page"
            >
              {tab.label}
            </span>
          );
        }
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="text-2xl font-bold text-muted transition-colors hover:text-foreground"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
