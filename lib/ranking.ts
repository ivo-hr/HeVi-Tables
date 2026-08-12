import type { LeaderboardEntry } from "@/lib/types";

function sameStanding(a: LeaderboardEntry, b: LeaderboardEntry) {
  return (
    a.points === b.points &&
    a.wins_count === b.wins_count &&
    a.average_points === b.average_points
  );
}

export function rankingPosition(entries: LeaderboardEntry[], index: number) {
  if (index < 0 || index >= entries.length) return null;

  let position = 1;
  for (let cursor = 1; cursor <= index; cursor += 1) {
    if (!sameStanding(entries[cursor], entries[cursor - 1])) {
      position = cursor + 1;
    }
  }
  return position;
}

export function userRankingPosition(entries: LeaderboardEntry[], userId: string) {
  return rankingPosition(
    entries,
    entries.findIndex((entry) => entry.user_id === userId)
  );
}
