import { Crown, Medal } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { formatPoints } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/types";

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="empty-ranking">
        <Crown size={35} />
        <h3>El podio está esperando</h3>
        <p>Cierra la primera tabla para estrenar el ránking.</p>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      {entries.map((entry, index) => (
        <article
          className={`leaderboard-row rank-${index + 1}`}
          key={entry.user_id}
        >
          <span className="rank">
            {index < 3 ? <Medal size={20} /> : String(index + 1).padStart(2, "0")}
          </span>
          <Avatar name={entry.username} src={entry.avatar_url} />
          <div className="leaderboard-name">
            <strong>{entry.username}</strong>
            <span>
              {entry.tables_count}{" "}
              {entry.tables_count === 1 ? "tabla puntuada" : "tablas puntuadas"}
            </span>
          </div>
          <div className="leaderboard-points">
            <strong>{formatPoints(entry.points)}</strong>
            <span>pts</span>
          </div>
        </article>
      ))}
    </div>
  );
}
