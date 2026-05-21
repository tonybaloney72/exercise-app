"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { surfaceCardClassName } from "@/components/common/SurfaceCard";

export type CardioStatCard = {
  label: string;
  value: string;
  icon: string;
};

interface RotatingCardioStatCardProps {
  cards: CardioStatCard[];
  /** ms between rotations when multiple cards */
  intervalMs?: number;
}

export default function RotatingCardioStatCard({
  cards,
  intervalMs = 4500,
}: RotatingCardioStatCardProps) {
  const [index, setIndex] = useState(0);
  const card = cards[index] ?? cards[0];

  useEffect(() => {
    if (cards.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % cards.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [cards.length, intervalMs]);

  if (!card) return null;

  return (
    <div className={`${surfaceCardClassName} relative p-4 overflow-hidden`}>
      {cards.length > 1 && (
        <div
          className="absolute bottom-2 right-2 flex gap-1"
          aria-hidden
        >
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1 w-1 rounded-full transition-colors ${
                i === index ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-lg">{card.icon}</span>
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
            {card.value}
          </p>
          <p className="text-[11px] leading-snug text-muted pr-4">{card.label}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
