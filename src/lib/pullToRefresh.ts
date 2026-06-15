import { isNativePlatform } from "@/lib/capacitorRuntime";

export type PullToRefreshEnvironment = {
  isNativePlatform: () => boolean;
  displayModeStandalone: boolean;
  iosStandalone: boolean;
};

/** True when the shell has no browser pull-to-refresh (Capacitor, installed PWA). */
export function shouldEnablePullToRefresh(
  env: PullToRefreshEnvironment = readPullToRefreshEnvironment(),
): boolean {
  if (env.isNativePlatform()) return true;
  return isStandaloneWebApp(env);
}

export function isStandaloneWebApp(
  env: Pick<
    PullToRefreshEnvironment,
    "displayModeStandalone" | "iosStandalone"
  > = readPullToRefreshEnvironment(),
): boolean {
  return env.displayModeStandalone || env.iosStandalone;
}

export function readPullToRefreshEnvironment(): PullToRefreshEnvironment {
  if (typeof window === "undefined") {
    return {
      isNativePlatform: () => false,
      displayModeStandalone: false,
      iosStandalone: false,
    };
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    isNativePlatform,
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone: nav.standalone === true,
  };
}
