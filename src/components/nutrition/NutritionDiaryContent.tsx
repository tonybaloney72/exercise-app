"use client";

import Link from "next/link";
import SurfaceCard from "@/components/common/SurfaceCard";
import FatSecretAttributionBadge from "@/components/nutrition/FatSecretAttributionBadge";
import NutritionDetailsDisclosure from "@/components/nutrition/NutritionDetailsDisclosure";
import NutritionMacroSummary from "@/components/nutrition/NutritionMacroSummary";
import NutritionMealSection from "@/components/nutrition/NutritionMealSection";
import { useNutritionDiary } from "@/hooks/useNutritionDiary";
import { routes } from "@/lib/appRoutes";
import {
  MEAL_LOG_SUBTITLE,
  MEAL_LOG_TITLE,
  VIEW_NUTRITION_ON_HEALTH_LINK,
} from "@/lib/nutrition/nutritionCopy";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

export default function NutritionDiaryContent() {
  const authMode = useAuthStore((s) => s.mode);
  const todayKey = formatLocalDateKey();
  const { data, loading, error, reload } = useNutritionDiary(todayKey);

  if (authMode === "loading") {
    return <p className="py-6 text-sm text-muted">Loading…</p>;
  }

  if (authMode === "guest" || authMode === "anonymous") {
    return (
      <div className="flex flex-col gap-4 py-6">
        <SurfaceCard className="flex flex-col gap-3 p-4">
          <h1 className="text-2xl font-bold text-foreground">{MEAL_LOG_TITLE}</h1>
          <p className="text-sm text-muted">
            Sign in with an account to log meals and snacks. Guest mode can search
            foods but does not save a log.
          </p>
          <Link
            href="/login"
            className="inline-flex justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white hover:bg-accent/90"
          >
            Log in
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  const hasConsumed = !loading && data != null && data.calories > 0;

  return (
    <div className="flex flex-col gap-3 py-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-bold text-foreground">{MEAL_LOG_TITLE}</h1>
        <p className="text-sm text-muted">{MEAL_LOG_SUBTITLE}</p>
      </div>

      <SurfaceCard className="p-4">
        <p className="text-sm text-muted">Consumed today</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
          {loading ? "…" : `${Math.round(data?.calories ?? 0)} kcal`}
        </p>
        {hasConsumed ? (
          <>
            <NutritionMacroSummary macros={data} variant="short" className="mt-1" />
            <NutritionDetailsDisclosure nutrition={data} className="mt-1.5" />
          </>
        ) : null}
        <Link
          href={routes.healthNutrition}
          className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
        >
          {VIEW_NUTRITION_ON_HEALTH_LINK}
        </Link>
      </SurfaceCard>

      {error ? (
        <SurfaceCard className="p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            Try again
          </button>
        </SurfaceCard>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-muted">Loading meal log…</p>
      ) : (
        data?.meals.map((summary) => (
          <NutritionMealSection
            key={summary.meal}
            summary={summary}
            dateKey={todayKey}
            onChanged={() => void reload()}
          />
        ))
      )}

      <FatSecretAttributionBadge className="pt-1" />
    </div>
  );
}
