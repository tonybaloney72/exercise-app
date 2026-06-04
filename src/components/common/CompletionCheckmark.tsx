"use client";

import { motion } from "framer-motion";

/** Animated check used on workout completion toggles. */
export default function CompletionCheckmark() {
  return (
    <motion.svg
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
    </motion.svg>
  );
}
