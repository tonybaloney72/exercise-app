"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useSuppressTabEnterAnimation } from "@/hooks/useSuppressTabEnterAnimation";

type TabEnterMotionProps = {
  children?: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  initialScale?: number;
};

/** Fade/slide in on mount, unless the user just switched bottom-nav tabs. */
export default function TabEnterMotion({
  children,
  className = "",
  delay = 0,
  y = 10,
  initialScale,
}: TabEnterMotionProps) {
  const suppress = useSuppressTabEnterAnimation();

  if (suppress) {
    return <div className={className}>{children}</div>;
  }

  if (initialScale != null) {
    return (
      <motion.div
        initial={{ scale: initialScale }}
        animate={{ scale: 1 }}
        transition={{ delay }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
