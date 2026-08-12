import {
  Activity,
  ChevronDown,
  Crown,
  Gauge,
  LockKeyhole,
  Medal,
  Sparkles,
  Target,
  Trophy
} from "lucide-react";

import { Avatar } from "@/components/avatar";
import { useLanguage } from "@/components/language-provider";
import { formatPoints } from "@/lib/format";
import { stableToneClass } from "@/lib/presentation";
import { rankingPosition } from "@/lib/ranking";
import type { LeaderboardEntry } from "@/lib/types";

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const { locale, t, date } = useLanguage();
  if (entries.length === 0) {
    return (
      <div className="empty-ranking">
        <Crown size={35} />
        <h3>{t("El podio está esperando", "The podium is waiting")}</h3>
        <p>{t("Añade registros y aquí empezarán las cuentas.", "Add entries and the numbers will start here.")}</p>
      </div>
    );
  }

  const totalEntries = entries.reduce((sum, entry) => sum + entry.entries_count, 0);
  const closedPoints = entries.reduce((sum, entry) => sum + entry.closed_points, 0);
  const provisionalPoints = entries.reduce(
    (sum, entry) => sum + entry.provisional_points,
    0
  );

  return (
    <div className="leaderboard-wrap">
      <div className="ranking-insights" aria-label={t("Resumen del ránking", "Leaderboard summary")}>
        <span>
          <Trophy size={17} />
          <small>{t("Lidera", "Leader")}</small>
          <strong>{entries[0].username}</strong>
        </span>
        <span>
          <Activity size={17} />
          <small>{t("Participaciones", "Entries")}</small>
          <strong>{totalEntries}</strong>
        </span>
        <span>
          <LockKeyhole size={17} />
          <small>{t("Confirmados", "Confirmed")}</small>
          <strong>{formatPoints(closedPoints, locale)} pts</strong>
        </span>
        <span>
          <Sparkles size={17} />
          <small>{t("En juego", "In play")}</small>
          <strong>{formatPoints(provisionalPoints, locale)} pts</strong>
        </span>
      </div>
      <div className="leaderboard">
        {entries.map((entry, index) => {
          const position = rankingPosition(entries, index) ?? index + 1;
          const winRate = entry.entries_count
            ? Math.round((entry.wins_count / entry.entries_count) * 100)
            : 0;
          return (
            <details
              className={`leaderboard-entry rank-${position} ${stableToneClass(`member:${entry.user_id}`)}`}
              key={entry.user_id}
            >
              <summary className="leaderboard-row">
                <span className="rank">
                  {position === 1 ? (
                    <span aria-label={t("Primera posición", "First place")} role="img">🏆</span>
                  ) : position < 4 ? (
                    <Medal size={20} />
                  ) : (
                    String(position).padStart(2, "0")
                  )}
                </span>
                <Avatar name={entry.username} src={entry.avatar_url} />
                <div className="leaderboard-name">
                  <strong>{entry.username}</strong>
                  <span>
                    {entry.entries_count} {entry.entries_count === 1 ? t("registro", "entry") : t("registros", "entries")}
                    {entry.wins_count ? ` · ${entry.wins_count} ${t("primeros puestos", "wins")}` : ""}
                  </span>
                </div>
                <div className="leaderboard-points">
                  <strong>{formatPoints(entry.points, locale)}</strong>
                  <span>pts</span>
                </div>
                <ChevronDown className="leaderboard-chevron" size={18} aria-hidden="true" />
              </summary>
              <div className="leaderboard-breakdown">
                <span><Target size={16} /><small>{t("Tablas", "Tables")}</small><strong>{entry.tables_count}</strong></span>
                <span><Trophy size={16} /><small>{t("Primeros", "Wins")}</small><strong>{entry.wins_count}</strong></span>
                <span><Gauge size={16} /><small>{t("Media", "Average")}</small><strong>{formatPoints(entry.average_points, locale)} pts</strong></span>
                <span><Sparkles size={16} /><small>{t("Mejor registro", "Best entry")}</small><strong>{formatPoints(entry.best_score, locale)} pts</strong></span>
                <span><LockKeyhole size={16} /><small>{t("Confirmados", "Confirmed")}</small><strong>{formatPoints(entry.closed_points, locale)} pts</strong></span>
                <span><Activity size={16} /><small>{t("Eficacia", "Win rate")}</small><strong>{winRate}%</strong></span>
              </div>
              <p className="leaderboard-activity">
                {entry.last_activity_at
                  ? `${t("Último movimiento", "Last activity")}: ${date(entry.last_activity_at, { day: "numeric", month: "short" })}`
                  : t("Todavía sin movimientos.", "No activity yet.")}
                {entry.provisional_points
                  ? ` · ${formatPoints(entry.provisional_points, locale)} ${t("puntos siguen en juego.", "points remain in play.")}`
                  : ""}
              </p>
            </details>
          );
        })}
      </div>
    </div>
  );
}
