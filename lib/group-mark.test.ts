import { describe, expect, it } from "vitest";

import {
  groupMarkLength,
  normalizeGroupMark,
  truncateGroupMark
} from "./group-mark";

describe("group marks", () => {
  it("counts composed emoji as one visible symbol", () => {
    expect(groupMarkLength("👨‍👩‍👧‍👦")).toBe(1);
    expect(groupMarkLength("🇪🇸🏆A")).toBe(3);
  });

  it("keeps at most three complete symbols", () => {
    expect(truncateGroupMark("🔥🎯🏆🚀")).toBe("🔥🎯🏆");
    expect(truncateGroupMark(" A B ")).toBe("AB");
  });

  it("normalizes surrounding space and Unicode composition", () => {
    expect(normalizeGroupMark("  A\u0301🔥  ")).toBe("Á🔥");
  });
});
