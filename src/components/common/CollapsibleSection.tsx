"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SurfaceCard from "@/components/common/SurfaceCard";

interface CollapsibleSectionProps {
  title: string;
  /** Subtitle under the title (shown open and collapsed). */
  hint?: string;
  defaultOpen?: boolean;
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
  headerActions,
  toolbar,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelToolbar = toolbar ?? headerActions;

  return (
    <SurfaceCard className={`overflow-hidden p-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-2 border-b border-border px-4 py-3 text-left"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mt-0.5 shrink-0 text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {hint ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-muted">{hint}</span>
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
                className="flex w-full flex-wrap items-center gap-2 border-b border-border bg-background/60 px-4 py-2.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {panelToolbar}
              </motion.div>
            ) : null}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </SurfaceCard>
  );
}
