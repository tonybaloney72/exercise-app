/** Canonical app paths — use instead of string literals for navigation. */

export const APP_HOME = "/workout";

export const routes = {
  workout: APP_HOME,
  workoutWeek: "/workout/week",
  workoutWeekDay: (dateKey: string) => `/workout/week/${dateKey}`,
  workoutHistory: "/workout/history",
  workoutHistoryDay: (dateKey: string) => `/workout/history/${dateKey}`,
  workoutHistoryLog: (dateKey: string) => `/workout/history/${dateKey}/log`,

  health: "/health",
  healthStat: (slug: string) => `/health/${slug}`,
  healthCalories: "/health/calories",
  healthExercises: "/health/exercises",
  healthExerciseKind: (kind: string) => `/health/exercises/${kind}`,

  settings: "/settings",
  settingsLibrary: "/settings/library",
  settingsTraining: "/settings/training",
  settingsBuildGuided: "/settings/build-guided",
  settingsBuildCustom: "/settings/build-custom",
  settingsDevice: "/settings/device",
  settingsApp: "/settings/app",
} as const;

const MAIN_TAB_ROUTES = [
  routes.workout,
  routes.health,
  routes.settings,
] as const;

export function isMainTabRoute(pathname: string): boolean {
  return (MAIN_TAB_ROUTES as readonly string[]).includes(pathname);
}
