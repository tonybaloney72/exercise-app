"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ExpandChevron from "@/components/workout/ExpandChevron";
import WorkoutRowOverflowMenu, {
  type WorkoutRowMenuItem,
} from "@/components/workout/WorkoutRowOverflowMenu";

export type WorkoutSectionCardProps = {
  title: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Session progress (e.g. 2/5 with bar). Omit in preview / plan edit. */
  progress?: { completed: number; total: number };
  /** Show ✓ when progress is complete (session). */
  showDoneCheck?: boolean;
  /** Right-side label when not using progress (e.g. "3 exercises"). */
  statusLabel?: string;
  menuItems?: WorkoutRowMenuItem[];
  /** Header control after the title (e.g. "+ Add"). */
  headerAction?: ReactNode;
  /** Shown below header when collapsed (e.g. rest timer prompt). */
  collapsedAccessory?: ReactNode;
  /** Toolbar at top of expanded body. */
  bodyToolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function WorkoutSectionCard({
  title,
  defaultOpen = true,
  open: openControlled,
  onOpenChange,
  progress,
  showDoneCheck = false,
  statusLabel,
  menuItems = [],
  headerAction,
  collapsedAccessory,
  bodyToolbar,
  footer,
  className = "",
  children,
}: WorkoutSectionCardProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openControlled !== undefined;
  const isOpen = isControlled ? openControlled : uncontrolledOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const showProgress = progress != null && total > 0;
  const allDone = showProgress && completed === total;
  const progressPct = showProgress ? (completed / total) * 100 : 0;

  return (
    <div
      className={`rounded-xl border border-border bg-surface ${className}`.trim()}
    >
      <div className="flex w-full items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {showDoneCheck && allDone ? (
              <span className="text-xs text-green-400">✓</span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showProgress ? (
              <>
                <span className="text-xs text-muted">
                  {completed}/{total}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </>
            ) : statusLabel ? (
              <span className="text-xs text-muted">{statusLabel}</span>
            ) : null}
            <ExpandChevron open={isOpen} />
          </div>
        </button>
        {headerAction}
        <WorkoutRowOverflowMenu items={menuItems} />
      </div>

      {!isOpen && collapsedAccessory ? (
        <div className="border-t border-border px-4 py-3">
          {collapsedAccessory}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {bodyToolbar ? (
              <div
                className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {bodyToolbar}
              </div>
            ) : null}
            <div className="border-t border-border p-2">{children}</div>
            {footer ? (
              <div className="border-t border-border px-3 py-2.5">{footer}</div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
