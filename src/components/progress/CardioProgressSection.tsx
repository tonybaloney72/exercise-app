"use client";

import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_ORDER,
  CARDIO_KIND_TO_EXERCISE_ID,
} from "@/lib/cardioActivities";
import { buildCardioChartSeries } from "@/utils/cardioProgressStats";
import type { WorkoutLog } from "@/types";
import CardioProgressChart from "./JogProgressChart";

interface Props {
  history: WorkoutLog[];
}

export default function CardioProgressSection({ history }: Props) {
  return (
    <>
      {CARDIO_ACTIVITY_ORDER.map((kind) => {
        const exerciseId = CARDIO_KIND_TO_EXERCISE_ID[kind];
        const series = buildCardioChartSeries(history, exerciseId);
        if (series.length === 0) return null;
        return (
          <CardioProgressChart
            key={exerciseId}
            history={history}
            exerciseId={exerciseId}
            title={`${CARDIO_ACTIVITY_EMOJI[kind]} ${kind.charAt(0).toUpperCase()}${kind.slice(1)}`}
          />
        );
      })}
    </>
  );
}
