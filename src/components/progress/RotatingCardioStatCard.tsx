"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
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

const SWIPE_THRESHOLD_PX = 40;

export default function RotatingCardioStatCard({
  cards,
  intervalMs = 4500,
}: RotatingCardioStatCardProps) {
  const [index, setIndex] = useState(0);
  const [rotationEpoch, setRotationEpoch] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const card = cards[index] ?? cards[0];
  const interactive = cards.length > 1;

  const bumpRotationEpoch = useCallback(() => {
    setRotationEpoch((e) => e + 1);
  }, []);

  const goToNext = useCallback(() => {
    setIndex((i) => (i + 1) % cards.length);
    bumpRotationEpoch();
  }, [cards.length, bumpRotationEpoch]);

  const goToPrev = useCallback(() => {
    setIndex((i) => (i - 1 + cards.length) % cards.length);
    bumpRotationEpoch();
  }, [cards.length, bumpRotationEpoch]);

  useEffect(() => {
    if (!interactive) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % cards.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [cards.length, intervalMs, rotationEpoch, interactive]);

  const cardsKey = useMemo(
    () => cards.map((c) => c.label).join("\0"),
    [cards],
  );

  useEffect(() => {
    setIndex(0);
  }, [cardsKey]);

  const handleClick = useCallback(() => {
    if (!interactive) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    goToNext();
  }, [interactive, goToNext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!interactive) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      }
    },
    [interactive, goToNext, goToPrev],
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!interactive) return;
      touchStartX.current = e.touches[0]?.clientX ?? null;
    },
    [interactive],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!interactive || touchStartX.current == null) return;
      const endX = e.changedTouches[0]?.clientX;
      if (endX == null) {
        touchStartX.current = null;
        return;
      }
      const delta = endX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      suppressClickRef.current = true;
      if (delta < 0) goToNext();
      else goToPrev();
    },
    [interactive, goToNext, goToPrev],
  );

  if (!card) return null;

  const ariaLabel = interactive
    ? `${card.label}: ${card.value}. Stat ${index + 1} of ${cards.length}. Tap or swipe to change.`
    : undefined;

  return (
    <div
      className={`${surfaceCardClassName} relative overflow-hidden p-4 ${
        interactive
          ? "cursor-pointer select-none touch-pan-y active:scale-[0.99] transition-transform"
          : ""
      }`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {interactive && (
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
          <p className="text-sm leading-snug text-muted pr-4">{card.label}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
