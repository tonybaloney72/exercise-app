import { describe, expect, it } from "vitest";
import {
  resolveEffectiveDarkMode,
  resolveThemeMode,
  sanitizeThemeMode,
} from "@/lib/themeMode";

describe("themeMode", () => {
  it("sanitizes unknown values to auto", () => {
    expect(sanitizeThemeMode("auto")).toBe("auto");
    expect(sanitizeThemeMode("bogus")).toBe("auto");
  });

  it("maps legacy darkMode booleans", () => {
    expect(resolveThemeMode({ darkMode: true })).toBe("dark");
    expect(resolveThemeMode({ darkMode: false })).toBe("light");
    expect(resolveThemeMode({})).toBe("auto");
  });

  it("prefers explicit themeMode over legacy darkMode", () => {
    expect(resolveThemeMode({ themeMode: "light", darkMode: true })).toBe(
      "light",
    );
    expect(resolveThemeMode({ darkMode: false })).toBe("light");
  });

  it("resolves effective dark from auto using device preference", () => {
    expect(resolveEffectiveDarkMode("dark", false)).toBe(true);
    expect(resolveEffectiveDarkMode("light", true)).toBe(false);
    expect(resolveEffectiveDarkMode("auto", true)).toBe(true);
    expect(resolveEffectiveDarkMode("auto", false)).toBe(false);
  });
});
