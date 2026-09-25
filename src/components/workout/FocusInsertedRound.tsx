"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  /** True briefly after this round was inserted. */
  active: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Scrolls into view and plays a short enter + accent ring when `active`
 * on mount (newly inserted round feedback).
 */
export default function FocusInsertedRound({
  active,
  children,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <motion.div
      ref={ref}
      initial={active ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl transition-[box-shadow] duration-300 ${
        active
          ? "shadow-[0_0_0_2px_var(--accent)]"
          : "shadow-[0_0_0_0_transparent]"
      } ${className}`.trim()}
    >
      {children}
    </motion.div>
  );
}
