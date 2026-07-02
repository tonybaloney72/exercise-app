"use client";

import { motion } from "framer-motion";
import SurfaceCard from "@/components/common/SurfaceCard";

export type RepIncreaseTeaserCardProps = {
  count: number;
  onOpen: () => void;
  onDismiss: () => void;
};

export default function RepIncreaseTeaserCard({
  count,
  onOpen,
  onDismiss,
}: RepIncreaseTeaserCardProps) {
  const label =
    count === 1
      ? "1 exercise ready to level up"
      : `${count} exercises ready to level up`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: [0, -3, 0],
      }}
      transition={{
        opacity: { duration: 0.35 },
        y: {
          duration: 1.6,
          repeat: 2,
          ease: "easeInOut",
        },
      }}
    >
      <SurfaceCard className="flex flex-col gap-3 border-accent/30 bg-accent/5 p-4">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full flex-col items-start gap-1 text-left"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-accent">
            Ready to level up?
          </span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-xs text-muted">
            Tap to review Library default increases
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="self-start text-xs font-medium text-muted hover:text-foreground"
        >
          Not now
        </button>
      </SurfaceCard>
    </motion.div>
  );
}
