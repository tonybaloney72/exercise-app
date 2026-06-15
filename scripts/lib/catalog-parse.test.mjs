import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import {
  parseExercisesFromText,
  parseQuotedStringField,
  ROOT,
} from "./catalog-parse.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("catalog-parse", () => {
  it("parses multiline videoUrl and notes", () => {
    const snippet = `  {
    id: "CF-11",
    name: "Single-Arm Toe Touch",
    category: "CF",
    equipment: ["bodyweight"],
    notes:
      "On back, lift opposite arm and leg.",
    source: "Healthline",
    videoUrl:
      "https://www.healthline.com/health/fitness-exercise/oblique-workout",
    isTimeBased: false,
  },`;
    const [ex] = parseExercisesFromText(snippet, "test.ts");
    expect(ex.videoUrl).toBe(
      "https://www.healthline.com/health/fitness-exercise/oblique-workout",
    );
    expect(ex.notes).toBe("On back, lift opposite arm and leg.");
    expect(ex.hasVideoField).toBe(true);
  });

  it("parseQuotedStringField handles single-line and key-only lines", () => {
    expect(
      parseQuotedStringField('    videoUrl: "https://youtu.be/x"', "", "videoUrl"),
    ).toEqual({
      value: "https://youtu.be/x",
      explicit: true,
      consumedNext: false,
    });
    expect(
      parseQuotedStringField("    videoUrl:", '      "https://example.com",', "videoUrl"),
    ).toEqual({
      value: "https://example.com",
      explicit: true,
      consumedNext: true,
    });
    expect(parseQuotedStringField("    videoUrl: undefined,", "", "videoUrl")).toEqual({
      value: null,
      explicit: true,
      consumedNext: false,
    });
  });

  it("reads CF-11 from exercises.ts with a real videoUrl", () => {
    const text = readFileSync(join(ROOT, "src/core/catalog/data/exercises.ts"), "utf8");
    const ex = parseExercisesFromText(text, "src/core/catalog/data/exercises.ts").find(
      (e) => e.id === "CF-11",
    );
    expect(ex?.videoUrl).toBe(
      "https://www.healthline.com/health/fitness-exercise/oblique-workout",
    );
    expect(ex?.notes).toContain("Healthline");
  });
});
