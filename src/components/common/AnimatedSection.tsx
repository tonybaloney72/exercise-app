"use client";

import { useRef, type ReactNode } from "react";
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
  const skipEnterAnimationRef = useRef(false);
  if (suppress) {
    skipEnterAnimationRef.current = true;
  }

  return (
    <motion.div
      initial={
        skipEnterAnimationRef.current ? false : { opacity: 0, y: 10 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: skipEnterAnimationRef.current ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
