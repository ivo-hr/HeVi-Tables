import { describe, expect, it } from "vitest";

import { smoothStrokePoints, type DrawingPoint } from "@/lib/drawing";

describe("smoothStrokePoints", () => {
  it("preserves the exact stroke endpoints", () => {
    const points: DrawingPoint[] = [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.42 },
      { x: 0.7, y: 0.55 },
      { x: 0.9, y: 0.8 }
    ];

    const result = smoothStrokePoints(points);
    expect(result[0]).toEqual(points[0]);
    expect(result.at(-1)).toEqual(points.at(-1));
  });

  it("reduces small alternating pointer jitter", () => {
    const points = Array.from({ length: 21 }, (_, index) => ({
      x: index / 20,
      y: 0.5 + (index % 2 === 0 ? 0.012 : -0.012)
    }));
    const averageDeviation = (values: readonly DrawingPoint[]) =>
      values.reduce((total, point) => total + Math.abs(point.y - 0.5), 0) /
      values.length;

    expect(averageDeviation(smoothStrokePoints(points))).toBeLessThan(
      averageDeviation(points)
    );
  });

  it("does not mutate captured pointer samples", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.7 },
      { x: 1, y: 1 }
    ];
    const snapshot = structuredClone(points);

    smoothStrokePoints(points);
    expect(points).toEqual(snapshot);
  });
});
