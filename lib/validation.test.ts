import { describe, expect, it } from "vitest";

import {
  appearanceSchema,
  groupSchema,
  inviteCodeSchema,
  optionalDateSchema,
  tableDescriptionSchema
} from "@/lib/validation";

describe("group validation", () => {
  it("trims a valid group name", () => {
    expect(groupSchema.parse({ name: "  Los del viaje  " })).toEqual({
      name: "Los del viaje"
    });
  });

  it("normalizes invite codes copied with spaces or dashes", () => {
    expect(inviteCodeSchema.parse("ab12-cd 34ef")).toBe("AB12CD34EF");
  });

  it("rejects malformed invite codes", () => {
    expect(inviteCodeSchema.safeParse("NO-EXISTE").success).toBe(false);
    expect(inviteCodeSchema.safeParse("ABC123").success).toBe(false);
  });
});

describe("table date validation", () => {
  it("accepts an ISO calendar date or an empty value", () => {
    expect(optionalDateSchema.parse("2026-08-15")).toBe("2026-08-15");
    expect(optionalDateSchema.parse("")).toBeNull();
  });

  it("rejects impossible calendar dates", () => {
    expect(optionalDateSchema.safeParse("2026-02-30").success).toBe(false);
  });
});

describe("appearance and description validation", () => {
  it("accepts supported themes and accent colors", () => {
    expect(appearanceSchema.parse({ theme: "dark", accent: "violet" })).toEqual({
      theme: "dark",
      accent: "violet"
    });
    expect(appearanceSchema.safeParse({ theme: "sepia", accent: "neon" }).success).toBe(false);
  });

  it("normalizes empty descriptions and rejects long ones", () => {
    expect(tableDescriptionSchema.parse("  Un resultado discutible.  ")).toBe(
      "Un resultado discutible."
    );
    expect(tableDescriptionSchema.parse("   ")).toBeNull();
    expect(tableDescriptionSchema.safeParse("x".repeat(281)).success).toBe(false);
  });
});
