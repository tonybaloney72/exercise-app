"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SurfaceCard from "@/components/common/SurfaceCard";

interface CollapsibleSectionProps {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  /** Shown when collapsed (e.g. exercise count). */
  badge?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  hint,
  defaultOpen = true,
  badge,
  headerActions,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <SurfaceCard className={`overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex items-stretch border-b border-border">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-start gap-2 px-4 py-3 text-left"
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
            <span className="block text-sm font-semibold text-foreground">
              {title}
            </span>
            {hint && (
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {hint}
              </span>
            )}
          </span>
          {!isOpen && badge && !hint ? (
            <span className="shrink-0 self-center text-xs text-muted">{badge}</span>
          ) : null}
        </button>
        {headerActions ? (
          <div
            className="flex shrink-0 items-center gap-1 border-l border-border px-3 py-3"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerActions}
          </div>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </SurfaceCard>
  );
}
