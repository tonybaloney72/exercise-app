"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import SurfaceCard from "@/components/common/SurfaceCard";
import AddFoodSheet from "@/components/nutrition/AddFoodSheet";
import { useNutritionDiary } from "@/hooks/useNutritionDiary";
import { routes } from "@/lib/appRoutes";
import type { FoodDetail } from "@/lib/fatsecret/foodDetail";
import {
  FATSECRET_MEALS,
  FATSECRET_MEAL_LABELS,
  type FatSecretMeal,
} from "@/lib/nutrition/fatsecretMeals";
import { useAuthStore } from "@/stores/useAuthStore";

const MEAL_EMOJI: Record<FatSecretMeal, string> = {
  breakfast: "🍳",
  lunch: "🥪",
  dinner: "🍗",
  other: "🍎",
};

type Props = {
  dateKey: string;
};

type AddSheetState = {
  meal: FatSecretMeal;
  initialFood?: FoodDetail;
};

const tileClass =
  "flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-hover px-2 py-3 min-h-[4.25rem] transition-colors hover:border-accent/40";

export default function QuickMealLog({ dateKey }: Props) {
  const [mounted, setMounted] = useState(false);
  const authMode = useAuthStore((s) => s.mode);
  const canLog = authMode === "authenticated";
  const [addSheet, setAddSheet] = useState<AddSheetState | null>(null);
  const { reload } = useNutritionDiary(dateKey, canLog);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openMeal(meal: FatSecretMeal) {
    if (authMode === "loading") return;
    if (!canLog) {
      toast.error("Sign in to log meals and snacks.");
      return;
    }
    setAddSheet({ meal });
  }

  return (
    <>
      <SurfaceCard className="flex flex-col gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Log food</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Quick add to today&apos;s meal log.
          </p>
        </div>

        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Quick log meal"
        >
          {FATSECRET_MEALS.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => openMeal(meal)}
              disabled={mounted && authMode === "loading"}
              className={`${tileClass} disabled:opacity-50`}
            >
              <span className="text-xl" aria-hidden>
                {MEAL_EMOJI[meal]}
              </span>
              <span className="text-caption font-medium text-foreground">
                {FATSECRET_MEAL_LABELS[meal]}
              </span>
            </button>
          ))}
        </div>

        {mounted && (authMode === "guest" || authMode === "anonymous" ? (
          <p className="text-xs text-muted">
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>{" "}
            to save your meal log.
          </p>
        ) : (
          <Link
            href={routes.meals}
            className="text-xs font-medium text-accent hover:underline"
          >
            Full meal log →
          </Link>
        ))}
      </SurfaceCard>

      {addSheet ? (
        <AddFoodSheet
          key={`${addSheet.meal}-${addSheet.initialFood?.foodId ?? "search"}`}
          open
          meal={addSheet.meal}
          dateKey={dateKey}
          initialFood={addSheet.initialFood ?? null}
          onClose={() => setAddSheet(null)}
          onLogged={() => void reload()}
        />
      ) : null}
    </>
  );
}
