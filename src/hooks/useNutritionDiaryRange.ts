"use client";

import { useEffect, useState } from "react";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { FoodDiaryDay } from "@/lib/fatsecret/foodDiary";

type RangeState = {
  byDate: Map<string, FoodDiaryDay>;
  loading: boolean;
  error: string | null;
};

const EMPTY_MAP = new Map<string, FoodDiaryDay>();

export function useNutritionDiaryRange(dateKeys: readonly string[], enabled = true) {
  const [state, setState] = useState<RangeState>({
    byDate: EMPTY_MAP,
    loading: enabled && dateKeys.length > 0,
    error: null,
  });

  const dateKeysKey = dateKeys.join(",");

  useEffect(() => {
    if (!enabled || dateKeys.length === 0) {
      setState({ byDate: EMPTY_MAP, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    void Promise.all(
      dateKeys.map(async (dateKey) => {
        try {
          const res = await fetch(
            resolveApiUrl(`/api/nutrition/diary?date=${encodeURIComponent(dateKey)}`),
          );
          if (!res.ok) return null;
          const payload = (await res.json()) as FoodDiaryDay;
          return { dateKey, diary: payload };
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const byDate = new Map<string, FoodDiaryDay>();
      for (const row of rows) {
        if (row) byDate.set(row.dateKey, row.diary);
      }
      setState({ byDate, loading: false, error: null });
    });

    return () => {
      cancelled = true;
    };
  }, [dateKeysKey, enabled]);

  return state;
}
