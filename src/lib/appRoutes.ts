/** Canonical app paths - use instead of string literals for navigation. */

export const APP_HOME = "/home";

export const routes = {
  home: APP_HOME,
  workout: "/workout",
  workoutWeek: "/workout/week",
  workoutWeekDay: (dateKey: string) => `/workout/week/${dateKey}`,
  workoutHistory: "/workout/history",
  workoutHistoryDay: (dateKey: string) => `/workout/history/${dateKey}`,
  workoutHistoryLog: (dateKey: string) => `/workout/history/${dateKey}/log`,

  health: "/health",
  healthStat: (slug: string) => `/health/${slug}`,
  healthNutrition: "/health/nutrition",
  healthExercises: "/health/exercises",
  healthExerciseKind: (kind: string) => `/health/exercises/${kind}`,

  meals: "/meals",

  settings: "/settings",
  settingsLibrary: "/settings/library",
  settingsTraining: "/settings/training",
  settingsBuildGuided: "/settings/build-guided",
  settingsBuildCustom: "/settings/build-custom",
  settingsDevice: "/settings/device",
  settingsApp: "/settings/app",
  settingsBody: "/settings/body",
} as const;

const MAIN_TAB_ROUTES = [
  routes.home,
  routes.workout,
  routes.meals,
  routes.health,
  routes.settings,
] as const;

export function isMainTabRoute(pathname: string): boolean {
  return (MAIN_TAB_ROUTES as readonly string[]).includes(pathname);
}
