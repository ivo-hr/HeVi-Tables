import type { Metadata } from "next";
import {
  ChevronLeft,
  Flame,
  Layers3,
  Plus,
  Trophy,
  Users
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { ConfigurationNeeded } from "@/components/configuration-needed";
import { InviteCode } from "@/components/invite-code";
import { Leaderboard } from "@/components/leaderboard";
import { RankingRealtimeRefresh } from "@/components/ranking-realtime-refresh";
import { SelectField } from "@/components/select-field";
import { TableCard } from "@/components/table-card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types";

type GroupPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; table?: string }>;
};

const periods = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "all", label: "Histórico" }
] as const;

export const metadata: Metadata = {
  title: "Grupo"
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();

  const { period: rawPeriod, table: rawTable } = await searchParams;
  const period = periods.some((item) => item.value === rawPeriod)
    ? (rawPeriod as "week" | "month" | "all")
    : "week";
  const tableId =
    rawTable && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(rawTable) ? rawTable : null;
  const { supabase, user } = await requireUser();

  const [groupResult, membershipsResult, tablesResult, rankingResult] =
    await Promise.all([
      supabase.from("grupos").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("grupo_miembros")
        .select("*")
        .eq("group_id", id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("tablas")
        .select("*")
        .eq("group_id", id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_group_leaderboard", {
        p_group_id: id,
        p_period: period,
        p_table_id: tableId
      })
    ]);

  if (groupResult.error || !groupResult.data) notFound();

  const group = groupResult.data;
  const memberships = membershipsResult.data ?? [];
  const memberIds = memberships.map((membership) => membership.user_id);
  const profilesResult = memberIds.length
    ? await supabase
        .from("perfiles")
        .select("*")
        .in("id", memberIds)
        .order("username", { ascending: true })
    : { data: [], error: null };
  const profiles = profilesResult.data ?? [];
  const tables = tablesResult.data ?? [];
  const entries = (rankingResult.data ?? []) as LeaderboardEntry[];
  const currentRank = entries.findIndex((entry) => entry.user_id === user.id);
  const currentEntry = currentRank >= 0 ? entries[currentRank] : null;
  const currentMembership = memberships.find(
    (membership) => membership.user_id === user.id
  );
  const selectedTable = tables.find((table) => table.id === tableId);
  const openTables = tables.filter((table) => !table.closed);

  return (
    <div className="group-page">
      <RankingRealtimeRefresh
        groupId={group.id}
        tableIds={tables.map((table) => table.id)}
      />
      <Link href="/" className="back-link">
        <ChevronLeft size={17} />
        Todos mis grupos
      </Link>

      <section className="group-workspace-header">
        <div className="group-identity">
          <div className="group-large-mark" aria-hidden="true">
            {group.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="eyebrow">Grupo privado</span>
            <h1>{group.name}</h1>
            <p>
              <Users size={16} />
              {memberships.length} {memberships.length === 1 ? "miembro" : "miembros"}
              <span aria-hidden="true">·</span>
              <Layers3 size={16} />
              {tables.length} {tables.length === 1 ? "tabla" : "tablas"}
            </p>
          </div>
        </div>
        <nav className="group-section-nav" aria-label="Secciones del grupo">
          <a href="#ranking">Ránking</a>
          <a href="#tablas">Tablas</a>
          <a href="#miembros">Miembros</a>
        </nav>
      </section>

      <section className="group-overview-grid">
        <aside className="personal-score group-personal-score">
          <span className="score-icon">
            <Flame size={23} />
          </span>
          <small>
            Tu posición · {periods.find((item) => item.value === period)?.label}
          </small>
          <strong>{currentRank >= 0 ? `#${currentRank + 1}` : "—"}</strong>
          <p>
            <b>{currentEntry?.points ?? 0}</b> puntos en{" "}
            {currentEntry?.tables_count ?? 0} tablas
          </p>
        </aside>
        <InviteCode
          code={group.invite_code}
          groupId={group.id}
          canRotate={currentMembership?.role === "owner"}
        />
      </section>

      <section className="group-members-strip" id="miembros">
        <div>
          <span className="eyebrow">Acceso al grupo</span>
          <h2>Miembros</h2>
        </div>
        <div className="group-member-list">
          {profiles.map((profile) => {
            const role = memberships.find(
              (membership) => membership.user_id === profile.id
            )?.role;
            return (
              <div className="group-member" key={profile.id}>
                <Avatar name={profile.username} src={profile.avatar_url} />
                <span>
                  <strong>{profile.username}</strong>
                  <small>{role === "owner" ? "Creador" : "Miembro"}</small>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ranking-section group-ranking-section" id="ranking">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">
              <Trophy size={14} />
              Clasificación del grupo
            </span>
            <h2>{selectedTable?.name ?? "Ránking general"}</h2>
          </div>
          <form className="table-filter">
            <input type="hidden" name="period" value={period} />
            <label htmlFor="table-filter">Filtrar tabla</label>
            <SelectField
              id="table-filter"
              name="table"
              ariaLabel="Filtrar por tabla"
              defaultValue={tableId ?? ""}
              options={[
                { value: "", label: "Todas las tablas" },
                ...tables.map((table) => ({ value: table.id, label: table.name }))
              ]}
            />
            <button>Aplicar</button>
          </form>
        </div>
        <div className="period-tabs" aria-label="Periodo del ránking">
          {periods.map((item) => {
            const query = new URLSearchParams({ period: item.value });
            if (tableId) query.set("table", tableId);
            return (
              <Link
                key={item.value}
                href={`/grupos/${group.id}?${query}#ranking`}
                className={period === item.value ? "active" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {rankingResult.error ? (
          <p className="form-message error">No se pudo cargar el ránking del grupo.</p>
        ) : (
          <Leaderboard entries={entries} />
        )}
      </section>

      <section className="tables-section group-tables-section" id="tablas">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">Actividad del grupo</span>
            <h2>Tablas</h2>
          </div>
          <Link href={`/grupos/${group.id}/tablas/nueva`} className="primary-button compact-button">
            <Plus size={17} />
            Nueva tabla
          </Link>
        </div>
        {tablesResult.error ? (
          <p className="form-message error">No se pudieron cargar las tablas.</p>
        ) : tables.length ? (
          <>
            {openTables.length ? <span className="open-count inline-count">{openTables.length} abiertas</span> : null}
            <div className="table-grid">
              {tables.map((table) => (
                <TableCard key={table.id} table={table} />
              ))}
            </div>
          </>
        ) : (
          <Link href={`/grupos/${group.id}/tablas/nueva`} className="first-table-card">
            <span>
              <Plus size={24} />
            </span>
            <div>
              <strong>Crea la primera tabla del grupo</strong>
              <p>Define las reglas, dibuja la portada y deja constancia.</p>
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}
