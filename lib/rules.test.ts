import { describe, expect, it } from "vitest";

import { calculatePoints, RuleValidationError } from "@/lib/rules";

const rows = [
  { id: "a", position: 1, pointsReceivable: 7 },
  { id: "b", position: 2, pointsReceivable: 3 },
  { id: "c", position: 8, pointsReceivable: 0 }
] as const;

describe("calculatePoints", () => {
  it("awards all WtA points to the only winner", () => {
    expect(calculatePoints("WtA", 10, rows).map((row) => row.pointsWon)).toEqual([
      10, 0, 0
    ]);
  });

  it("applies the podium formula and clamps at zero", () => {
    expect(calculatePoints("Pod", 10, rows).map((row) => row.pointsWon)).toEqual([
      10, 8, 0
    ]);
  });

  it("copies EC points", () => {
    expect(calculatePoints("EC", 10, rows).map((row) => row.pointsWon)).toEqual([
      7, 3, 0
    ]);
  });

  it("does not mutate its input", () => {
    const input = [{ id: "a", position: null, pointsReceivable: 4 }];
    const before = structuredClone(input);
    calculatePoints("EC", 5, input);
    expect(input).toEqual(before);
  });

  it("rejects invalid rule state", () => {
    expect(() =>
      calculatePoints("WtA", 10, [
        { id: "a", position: 1, pointsReceivable: null },
        { id: "b", position: 1, pointsReceivable: null }
      ])
    ).toThrow(RuleValidationError);

    expect(() =>
      calculatePoints("EC", 10, [
        { id: "a", position: null, pointsReceivable: 11 }
      ])
    ).toThrow("entre 0 y 10");
  });
});
