import { describe, expect, it } from "vitest";

import { ITEM_TONES, stableIndex, stableToneClass, stableVariant } from "./presentation";

describe("stable presentation choices", () => {
  it("keeps the same choice for the same id", () => {
    expect(stableToneClass("row:6d9a1d63")).toBe(stableToneClass("row:6d9a1d63"));
    expect(stableVariant("event:42", ["a", "b", "c"])).toBe(
      stableVariant("event:42", ["a", "b", "c"])
    );
  });

  it("always returns a valid tone", () => {
    for (const seed of ["one", "two", "three", "four", "five", "six"]) {
      expect(ITEM_TONES).toContain(stableToneClass(seed).replace("item-tone-", ""));
    }
  });

  it("rejects empty variant lists", () => {
    expect(() => stableIndex("seed", 0)).toThrow(RangeError);
  });
});
