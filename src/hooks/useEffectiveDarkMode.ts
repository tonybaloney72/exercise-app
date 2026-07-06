"use client";

import { useEffect, useState } from "react";
import {
  applyThemeToDocument,
  resolveEffectiveDarkMode,
} from "@/lib/themeMode";
import { useSettingsStore } from "@/stores/useSettingsStore";

function readPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolved light/dark for UI that cannot use CSS variables alone (e.g. Sonner). */
export function useEffectiveDarkMode(): boolean {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const [prefersDark, setPrefersDark] = useState(readPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return resolveEffectiveDarkMode(themeMode, prefersDark);
}

/** Keeps `document.documentElement` in sync with theme preference (see globals.css). */
export function useDocumentThemeSync(): void {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const [prefersDark, setPrefersDark] = useState(readPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const nextPrefersDark = mq.matches;
      setPrefersDark(nextPrefersDark);
      applyThemeToDocument(themeMode, nextPrefersDark);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [themeMode]);
}
