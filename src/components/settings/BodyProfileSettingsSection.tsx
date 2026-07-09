"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SurfaceCard from "@/components/common/SurfaceCard";
import WeightLogCard from "@/components/workout/WeightLogCard";
import { useBodyBmr } from "@/hooks/useBodyBmr";
import { routes } from "@/lib/appRoutes";
import { formatHeightIn, heightInFromFields, parseHeightFields } from "@/lib/bodyProfile";
import type { BodySexAtBirth } from "@/types";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

const inputClassName =
  "w-full rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-accent";

export default function BodyProfileSettingsSection() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const bodySexAtBirth = useSettingsStore((s) => s.bodySexAtBirth);
  const bodyBirthDate = useSettingsStore((s) => s.bodyBirthDate);
  const bodyHeightIn = useSettingsStore((s) => s.bodyHeightIn);
  const { bmrDaily, profileComplete } = useBodyBmr();
  const todayKey = formatLocalDateKey();

  const [birthDateInput, setBirthDateInput] = useState(bodyBirthDate ?? "");
  const initialHeight = useMemo(
    () => parseHeightFields(bodyHeightIn),
    [bodyHeightIn],
  );
  const [feetInput, setFeetInput] = useState(initialHeight.feet);
  const [inchesInput, setInchesInput] = useState(initialHeight.inches);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setBirthDateInput(bodyBirthDate ?? "");
  }, [bodyBirthDate]);

  useEffect(() => {
    const next = parseHeightFields(bodyHeightIn);
    setFeetInput(next.feet);
    setInchesInput(next.inches);
  }, [bodyHeightIn]);

  const saveSex = useCallback(
    (sex: BodySexAtBirth) => {
      void updateSettings({ bodySexAtBirth: sex });
    },
    [updateSettings],
  );

  const saveBirthDate = useCallback(() => {
    const trimmed = birthDateInput.trim();
    void updateSettings({ bodyBirthDate: trimmed || null });
  }, [birthDateInput, updateSettings]);

  const saveHeight = useCallback(() => {
    const heightIn = heightInFromFields(feetInput, inchesInput);
    void updateSettings({ bodyHeightIn: heightIn });
  }, [feetInput, inchesInput, updateSettings]);

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Body profile</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Used to estimate passive calories (BMR) on the Nutrition page. Mifflin–St
            Jeor formula; estimates only.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground">Sex at birth</span>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as const).map((sex) => {
              const selected = bodySexAtBirth === sex;
              return (
                <button
                  key={sex}
                  type="button"
                  onClick={() => saveSex(sex)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                    selected
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface-hover text-foreground hover:border-accent/40"
                  }`}
                >
                  {sex}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Date of birth</span>
          <input
            type="date"
            value={birthDateInput}
            onChange={(e) => setBirthDateInput(e.target.value)}
            onBlur={saveBirthDate}
            className={inputClassName}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Height</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Feet</span>
              <input
                type="number"
                inputMode="numeric"
                min={3}
                max={8}
                value={feetInput}
                onChange={(e) => setFeetInput(e.target.value)}
                onBlur={saveHeight}
                placeholder="5"
                className={inputClassName}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Inches</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                value={inchesInput}
                onChange={(e) => setInchesInput(e.target.value)}
                onBlur={saveHeight}
                placeholder="10"
                className={inputClassName}
              />
            </label>
          </div>
          {bodyHeightIn != null ? (
            <p className="text-xs text-muted">{formatHeightIn(bodyHeightIn)}</p>
          ) : null}
        </div>

        {profileComplete && bmrDaily != null ? (
          <p className="rounded-xl border border-border bg-surface-hover px-3 py-2 text-sm text-foreground">
            Estimated BMR today:{" "}
            <span className="font-semibold tabular-nums">{bmrDaily} kcal</span>
          </p>
        ) : (
          <p className="text-xs text-muted">
            Add sex, birth date, height, and at least one weight entry to see BMR.
          </p>
        )}
      </SurfaceCard>

      <WeightLogCard dateKey={todayKey} />

      <p className="text-xs text-muted">
        Weight trends also appear on{" "}
        <Link href={routes.healthStat("weight")} className="text-accent hover:underline">
          Health → Weight
        </Link>
        .
      </p>
    </div>
  );
}
