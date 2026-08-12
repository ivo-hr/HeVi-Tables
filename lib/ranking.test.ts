import { describe, expect, it } from "vitest";

import { rankingPosition, userRankingPosition } from "./ranking";
import type { LeaderboardEntry } from "./types";

const entry = (
  userId: string,
  points: number,
  wins = 0,
  average = 0
): LeaderboardEntry => ({
  user_id: userId,
  username: userId,
  avatar_url: null,
  points,
  tables_count: 1,
  entries_count: 1,
  wins_count: wins,
  average_points: average,
  best_score: points,
  closed_points: points,
  provisional_points: 0,
  last_activity_at: null
});

describe("ranking positions", () => {
  it("shares a position only when all ranking tie-breakers match", () => {
    const entries = [entry("a", 10, 2, 5), entry("b", 10, 2, 5), entry("c", 8)];
    expect(rankingPosition(entries, 0)).toBe(1);
    expect(rankingPosition(entries, 1)).toBe(1);
    expect(rankingPosition(entries, 2)).toBe(3);
  });

  it("uses wins and average points as tie-breakers", () => {
    const entries = [entry("a", 10, 2, 5), entry("b", 10, 1, 5)];
    expect(userRankingPosition(entries, "b")).toBe(2);
    expect(userRankingPosition(entries, "missing")).toBeNull();
  });
});
