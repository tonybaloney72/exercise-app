import { describe, expect, it } from "vitest";
import {
  buildGpsPolylineSvgModel,
  hasRenderableGpsRoute,
} from "@/lib/geo/gpsTrackPolyline";

describe("hasRenderableGpsRoute", () => {
  it("requires at least two points", () => {
    expect(hasRenderableGpsRoute(undefined)).toBe(false);
    expect(hasRenderableGpsRoute([])).toBe(false);
    expect(
      hasRenderableGpsRoute([{ lat: 40, lng: -105, timestamp: 1 }]),
    ).toBe(false);
    expect(
      hasRenderableGpsRoute([
        { lat: 40, lng: -105, timestamp: 1 },
        { lat: 40.01, lng: -105, timestamp: 2 },
      ]),
    ).toBe(true);
  });
});

describe("buildGpsPolylineSvgModel", () => {
  it("returns null for insufficient points", () => {
    expect(buildGpsPolylineSvgModel([])).toBeNull();
    expect(
      buildGpsPolylineSvgModel([{ lat: 40, lng: -105, timestamp: 1 }]),
    ).toBeNull();
  });

  it("projects a northbound line with start below end in SVG space", () => {
    const model = buildGpsPolylineSvgModel(
      [
        { lat: 40.0, lng: -105.0, timestamp: 1 },
        { lat: 40.02, lng: -105.0, timestamp: 2 },
      ],
      { width: 100, height: 100, padding: 0 },
    );
    expect(model).not.toBeNull();
    expect(model!.start.y).toBeGreaterThan(model!.end.y);
    expect(model!.pathD).toMatch(/^M /);
  });

  it("keeps all points inside the padded view box", () => {
    const points = [
      { lat: 40.0, lng: -105.0, timestamp: 1 },
      { lat: 40.01, lng: -104.99, timestamp: 2 },
      { lat: 40.02, lng: -104.98, timestamp: 3 },
    ];
    const model = buildGpsPolylineSvgModel(points, {
      width: 200,
      height: 120,
      padding: 12,
    });
    expect(model).not.toBeNull();
    expect(model!.viewBox).toBe("0 0 200 120");
    expect(model!.start.x).toBeGreaterThanOrEqual(12);
    expect(model!.start.y).toBeGreaterThanOrEqual(12);
    expect(model!.end.x).toBeLessThanOrEqual(188);
    expect(model!.end.y).toBeLessThanOrEqual(108);
  });
});
