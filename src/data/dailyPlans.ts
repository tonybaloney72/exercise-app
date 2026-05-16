/**
 * @deprecated Author templates moved to `trainingWeekCatalog.ts` (seed only).
 * Do not import from app pages — use `planResolver` / `useDayPlan`.
 */
export {
  TRAINING_WEEK_CATALOG as dailyPlans,
  getCatalogPlanForDay as getPlanForDay,
  buildCatalogWeek,
} from "./trainingWeekCatalog";
