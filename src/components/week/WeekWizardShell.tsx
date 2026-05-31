"use client";

import Link from "next/link";
import SurfaceCard from "@/components/common/SurfaceCard";
import { WEEK_DAY_ABBRS } from "@/lib/weekWizardConstants";
import { formatLocalDateKey } from "@/utils/localDateKey";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  activeDow: number;
  weekDateKeys: string[];
  stripSecondary: (dow: number) => string;
  onSelectDow: (dow: number) => void;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export default function WeekWizardShell({
  backHref,
  backLabel,
  title,
  subtitle,
  activeDow,
  weekDateKeys,
  stripSecondary,
  onSelectDow,
  footer,
  children,
}: Props) {
  const todayKey = formatLocalDateKey(new Date());

  return (
    <div className="py-6 space-y-5 pb-24">
      <div>
        <Link
          href={backHref}
          className="text-sm font-medium text-accent hover:text-accent/80"
        >
          {backLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {WEEK_DAY_ABBRS.map((label, dow) => {
          const selected = dow === activeDow;
          const isToday = weekDateKeys[dow] === todayKey;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectDow(dow)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-center transition-colors ${
                selected
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              <span className="block text-caption font-semibold uppercase">
                {label}
              </span>
              <span className="mt-0.5 block text-xs">
                {stripSecondary(dow)}
              </span>
              {isToday ? (
                <span className="mt-0.5 block text-[9px] text-accent">
                  Today
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {children}

      <SurfaceCard className="p-4">{footer}</SurfaceCard>
    </div>
  );
}

export function WeekWizardNavFooter({
  activeDow,
  onPrev,
  onNext,
  nextLabel,
  nextPrimary = false,
  prevDisabled = false,
  nextDisabled = false,
}: {
  activeDow: number;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel: string;
  nextPrimary?: boolean;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const showPrev = activeDow > 0 && onPrev;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        className={`flex w-full ${showPrev ? "justify-between" : "justify-end"}`}
      >
        {showPrev ? (
          <button
            type="button"
            disabled={prevDisabled}
            onClick={onPrev}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            ← {WEEK_DAY_ABBRS[activeDow - 1]}
          </button>
        ) : null}
        {onNext ? (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className={`rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50 ${
              nextPrimary
                ? "bg-accent text-white hover:bg-accent/90"
                : "border border-border text-foreground hover:bg-surface-hover"
            }`}
          >
            {nextLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
