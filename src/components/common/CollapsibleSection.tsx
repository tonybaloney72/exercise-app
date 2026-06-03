"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SurfaceCard from "@/components/common/SurfaceCard";
import ExpandChevron from "@/components/workout/ExpandChevron";

interface CollapsibleSectionProps {
  title: string;
  /** Subtitle under the title (shown open and collapsed). */
  hint?: string;
  defaultOpen?: boolean;
  /** Nested panel inside another card (no outer SurfaceCard). */
  embedded?: boolean;
  /** Classes on the expanded content wrapper. */
  contentClassName?: string;
  /** @deprecated Use `toolbar` — actions in the header crowd mobile layouts. */
  headerActions?: ReactNode;
  /** Actions in a row at the top of the expanded panel (e.g. Add exercise). */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  hint,
  defaultOpen = true,
  embedded = false,
  contentClassName,
  headerActions,
  toolbar,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelToolbar = toolbar ?? headerActions;

  const titleClass = embedded
    ? "text-sm font-semibold text-foreground"
    : "text-base font-semibold text-foreground";

  const headerButtonClass = embedded
    ? "flex w-full items-start gap-2 border-t border-border py-3 text-left"
    : "flex w-full items-start gap-2 border-b border-border px-4 py-3 text-left";

  const bodyClass = contentClassName ?? (embedded ? "space-y-3" : undefined);

  const panel = (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className={headerButtonClass}
      >
        <ExpandChevron open={isOpen} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className={`block ${titleClass}`}>{title}</span>
          {hint ? (
            <span className="mt-0.5 block text-sm leading-snug text-muted">{hint}</span>
          ) : null}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {panelToolbar ? (
              <motion.div
                className={`flex w-full flex-wrap items-center gap-2 border-b border-border bg-background/60 py-2.5 ${
                  embedded ? "" : "px-4"
                }`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {panelToolbar}
              </motion.div>
            ) : null}
            {bodyClass ? (
              <motion.div className={bodyClass}>{children}</motion.div>
            ) : (
              children
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (embedded) {
    return <div className={className}>{panel}</div>;
  }

  return (
    <SurfaceCard className={`overflow-hidden p-0 ${className ?? ""}`}>
      {panel}
    </SurfaceCard>
  );
}
