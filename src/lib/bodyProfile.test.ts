import { describe, expect, it } from "vitest";
import {
  heightInFromFields,
  parseHeightFields,
  sanitizeBodyBirthDate,
  sanitizeBodyHeightIn,
  sanitizeBodySexAtBirth,
} from "@/lib/bodyProfile";

describe("bodyProfile sanitizers", () => {
  it("accepts valid profile fields", () => {
    expect(sanitizeBodySexAtBirth("male")).toBe("male");
    expect(sanitizeBodyBirthDate("1991-01-15")).toBe("1991-01-15");
    expect(sanitizeBodyHeightIn(70)).toBe(70);
  });

  it("rejects invalid values", () => {
    expect(sanitizeBodySexAtBirth("other")).toBeNull();
    expect(sanitizeBodyBirthDate("not-a-date")).toBeNull();
    expect(sanitizeBodyHeightIn(30)).toBeNull();
  });
});

describe("height field helpers", () => {
  it("round-trips feet and inches", () => {
    expect(parseHeightFields(70)).toEqual({ feet: "5", inches: "10" });
    expect(heightInFromFields("5", "10")).toBe(70);
  });
});
