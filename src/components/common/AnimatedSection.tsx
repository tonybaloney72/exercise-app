"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useSuppressTabEnterAnimation } from "@/hooks/useSuppressTabEnterAnimation";

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export default function AnimatedSection({
  children,
  className = "",
  delay = 0.05,
}: AnimatedSectionProps) {
  const suppress = useSuppressTabEnterAnimation();

  if (suppress) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
