/** Bottom-nav tab roots — used to skip enter animations on tab-to-tab switches. */
export const MAIN_TAB_ROUTES = [
  "/today",
  "/weekly",
  "/progress",
  "/library",
  "/settings",
] as const;

export type MainTabRoute = (typeof MAIN_TAB_ROUTES)[number];

export function isMainTabRoute(pathname: string): boolean {
  return (MAIN_TAB_ROUTES as readonly string[]).includes(pathname);
}
