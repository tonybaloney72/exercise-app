import { describe, expect, it } from "vitest";
import { getFocusableElements } from "@/hooks/useFocusTrap";

describe("useFocusTrap", () => {
  it("getFocusableElements returns empty without a root", () => {
    expect(getFocusableElements(null)).toEqual([]);
  });
});
