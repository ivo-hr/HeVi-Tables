import { ArrowRight, Flame, Plus, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { Leaderboard } from "@/components/leaderboard";
import { TableCard } from "@/components/table-card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types";

type DashboardProps = {
  searchParams: Promise<{ period?: string; table?: string }>;
};

const periods = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "all", label: "Histórico" }
] as const;

export default async function Dashboard({ searchParams }: DashboardProps) {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { period: rawPeriod, table: rawTable } = await searchParams;
  const period = periods.some((item) => item.value === rawPeriod)
    ? (rawPeriod as "week" | "month" | "all")
    : "week";
  const tableId =
    rawTable && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(rawTable) ? rawTable : null;
  const { supabase, user } = await requireUser();

  const [rankingResult, tablesResult] = await Promise.all([
    supabase.rpc("get_leaderboard", {
      p_period: period,
      p_table_id: tableId
    }),
    supabase
      .from("tablas")
      .select("*")
      .order("created_at", { ascending: false })
  ]);

  const entries = (rankingResult.data ?? []) as LeaderboardEntry[];
  const tables = tablesResult.data ?? [];
  const currentRank = entries.findIndex((entry) => entry.user_id === user.id);
  const currentEntry = currentRank >= 0 ? entries[currentRank] : null;
  const openTables = tables.filter((table) => !table.closed);
  const selectedTable = tables.find((table) => table.id === tableId);

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            Ránking entre amigos
          </span>
          <h1>
            Que hablen
            <br />
            <em>los puntos.</em>
          </h1>
          <p>
            Crea una tabla, apunta las predicciones y deja que HeVi haga las
            cuentas cuando llegue el resultado.
          </p>
          <Link href="/tablas/nueva" className="primary-button">
            <Plus size={18} />
            Crear una tabla
          </Link>
        </div>
        <aside className="personal-score">
          <span className="score-icon">
            <Flame size={23} />
          </span>
          <small>Tu posición · {periods.find((item) => item.value === period)?.label}</small>
          <strong>{currentRank >= 0 ? `#${currentRank + 1}` : "—"}</strong>
          <p>
            <b>{currentEntry?.points ?? 0}</b> puntos en{" "}
            {currentEntry?.tables_count ?? 0} tablas
          </p>
        </aside>
      </section>

      <section className="ranking-section">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">
              <Trophy size={14} />
              Clasificación
            </span>
            <h2>{selectedTable?.name ?? "Ránking global"}</h2>
          </div>
          <form className="table-filter">
            <input type="hidden" name="period" value={period} />
            <label htmlFor="table-filter">Filtrar tabla</label>
            <select
              id="table-filter"
              name="table"
              defaultValue={tableId ?? ""}
            >
              <option value="">Todas las tablas</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
            <button>Aplicar</button>
          </form>
        </div>
        <div className="period-tabs" aria-label="Periodo del ránking">
          {periods.map((item) => {
            const params = new URLSearchParams({ period: item.value });
            if (tableId) params.set("table", tableId);
            return (
              <Link
                key={item.value}
                href={`/?${params}`}
                className={period === item.value ? "active" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {rankingResult.error ? (
          <p className="form-message error">
            No se pudo cargar el ránking. Comprueba que la migración esté aplicada.
          </p>
        ) : (
          <Leaderboard entries={entries} />
        )}
      </section>

      <section className="tables-section">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">En juego</span>
            <h2>Tablas recientes</h2>
          </div>
          {openTables.length ? (
            <span className="open-count">{openTables.length} abiertas</span>
          ) : null}
        </div>
        {tables.length ? (
          <div className="table-grid">
            {tables.slice(0, 6).map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>
        ) : (
          <Link href="/tablas/nueva" className="first-table-card">
            <span>
              <Plus size={24} />
            </span>
            <div>
              <strong>Crea la primera tabla</strong>
              <p>Elige las reglas y dibuja una portada en menos de un minuto.</p>
            </div>
            <ArrowRight size={21} />
          </Link>
        )}
      </section>
    </>
  );
}
