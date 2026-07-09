import { describe, expect, it } from "vitest";
import {
  isBarcodeScanCancelled,
  pluginErrorMessage,
} from "@/lib/nutrition/barcodeScan";

describe("pluginErrorMessage", () => {
  it("reads Capacitor-style rejection objects", () => {
    expect(pluginErrorMessage({ message: "scan canceled." })).toBe(
      "scan canceled.",
    );
  });
});

describe("isBarcodeScanCancelled", () => {
  it("detects cancel messages from native bridge", () => {
    expect(isBarcodeScanCancelled({ message: "scan canceled." })).toBe(true);
    expect(isBarcodeScanCancelled(new Error("User cancelled scan"))).toBe(true);
    expect(isBarcodeScanCancelled({ message: "Camera unavailable" })).toBe(false);
  });
});
