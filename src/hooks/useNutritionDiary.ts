"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { FoodDiaryDay } from "@/lib/fatsecret/foodDiary";
import { formatLocalDateKey } from "@/utils/localDateKey";

type DiaryState = {
  data: FoodDiaryDay | null;
  loading: boolean;
  error: string | null;
};

export function useNutritionDiary(dateKey: string, enabled = true) {
  const [state, setState] = useState<DiaryState>({
    data: null,
    loading: enabled,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!enabled) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const res = await fetch(
        resolveApiUrl(`/api/nutrition/diary?date=${encodeURIComponent(dateKey)}`),
      );
      const payload = (await res.json()) as FoodDiaryDay | { error?: string };
      if (!res.ok) {
        const message =
          "error" in payload && payload.error
            ? payload.error
            : "Could not load meal log.";
        setState({ data: null, loading: false, error: message });
        return;
      }
      setState({ data: payload as FoodDiaryDay, loading: false, error: null });
    } catch {
      setState({
        data: null,
        loading: false,
        error: "Could not load meal log.",
      });
    }
  }, [dateKey, enabled]);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    void reload();
  }, [reload, enabled]);

  return { ...state, reload };
}

export async function logFoodDiaryEntry(args: {
  dateKey: string;
  meal: string;
  foodId: string;
  foodName: string;
  servingId: string;
  numberOfUnits: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(resolveApiUrl("/api/nutrition/diary"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: args.dateKey,
      meal: args.meal,
      foodId: args.foodId,
      foodName: args.foodName,
      servingId: args.servingId,
      numberOfUnits: args.numberOfUnits,
    }),
  });
  const payload = (await res.json()) as { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      error: payload.error ?? "Could not log food.",
    };
  }
  return { ok: true };
}

export async function removeNutritionDiaryEntry(
  entryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(
    resolveApiUrl(`/api/nutrition/diary?entryId=${encodeURIComponent(entryId)}`),
    { method: "DELETE" },
  );
  const payload = (await res.json()) as { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      error: payload.error ?? "Could not remove entry.",
    };
  }
  return { ok: true };
}
