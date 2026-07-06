import type { ThemeMode, UserSettings } from "@/types";

export type { ThemeMode };

export const THEME_MODES: ThemeMode[] = ["auto", "light", "dark"];

export const THEME_MODE_LABELS: Record<
  ThemeMode,
  { label: string; description: string }
> = {
  auto: {
    label: "Auto",
    description: "Match your device light or dark setting",
  },
  light: {
    label: "Light",
    description: "Light background across the app",
  },
  dark: {
    label: "Dark",
    description: "Dark background across the app",
  },
};

export function sanitizeThemeMode(value: unknown): ThemeMode {
  if (value === "auto" || value === "light" || value === "dark") return value;
  return "auto";
}

/** Map legacy `darkMode` boolean snapshots to a concrete theme preference. */
function themeModeFromLegacyDarkMode(
  darkMode: boolean | undefined,
): ThemeMode | undefined {
  if (darkMode === true) return "dark";
  if (darkMode === false) return "light";
  return undefined;
}

export function resolveThemeMode(
  partial: Partial<UserSettings> & { darkMode?: boolean },
  fallback: ThemeMode = "auto",
): ThemeMode {
  if (
    partial.themeMode === "auto" ||
    partial.themeMode === "light" ||
    partial.themeMode === "dark"
  ) {
    return partial.themeMode;
  }
  return themeModeFromLegacyDarkMode(partial.darkMode) ?? fallback;
}

export function resolveEffectiveDarkMode(
  themeMode: ThemeMode,
  prefersDark: boolean,
): boolean {
  if (themeMode === "dark") return true;
  if (themeMode === "light") return false;
  return prefersDark;
}

export function applyThemeToDocument(
  themeMode: ThemeMode,
  prefersDark: boolean,
): void {
  const root = document.documentElement;
  if (resolveEffectiveDarkMode(themeMode, prefersDark)) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", "light");
  }
}
