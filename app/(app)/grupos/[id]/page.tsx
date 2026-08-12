import type { Metadata } from "next";
import {
  ChevronLeft,
  Layers3,
  Plus,
  Users
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { ConfigurationNeeded } from "@/components/configuration-needed";
import { GroupIdentitySettings } from "@/components/group-identity-settings";
import { InviteCode } from "@/components/invite-code";
import {
  LiveRanking,
  PersonalRankingScore,
  RankingProvider,
  type RankingPeriod
} from "@/components/live-ranking";
import { TableExplorer } from "@/components/table-explorer";
import { calendarPeriodKey, isDateKey } from "@/lib/calendar-periods";
import { groupMarkLength } from "@/lib/group-mark";
import { stableToneClass } from "@/lib/presentation";
import { getServerTranslator } from "@/lib/i18n-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types";

type GroupPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; table?: string; date?: string }>;
};

const periods = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "all", label: "Histórico" }
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return { title: t("Grupo", "Group") };
}

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { t } = await getServerTranslator();
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();

  const { period: rawPeriod, table: rawTable, date: rawDate } = await searchParams;
  const period = periods.some((item) => item.value === rawPeriod)
    ? (rawPeriod as RankingPeriod)
    : "month";
  const tableId =
    rawTable && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(rawTable) ? rawTable : null;
  const anchorDate =
    period !== "all" && isDateKey(rawDate)
      ? calendarPeriodKey(period, rawDate)
      : null;
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
        p_table_id: tableId,
        p_anchor_date: anchorDate
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
  const currentMembership = memberships.find(
    (membership) => membership.user_id === user.id
  );

  return (
    <RankingProvider
      groupId={group.id}
      initialEntries={entries}
      initialPeriod={period}
      initialTableId={tableId}
      initialAnchorDate={anchorDate}
      initialError={rankingResult.error ? t("No se pudo cargar el ránking del grupo.", "The group leaderboard could not be loaded.") : null}
    >
      <div className="group-page">
      <Link href="/" className="back-link">
        <ChevronLeft size={17} />
        {t("Todos mis grupos", "All my groups")}
      </Link>

      <section className="group-workspace-header">
        <div className="group-identity">
          {currentMembership?.role === "owner" ? (
            <GroupIdentitySettings
              groupId={group.id}
              initialMark={group.mark}
              toneClass={stableToneClass(`group:${group.id}`)}
            />
          ) : (
            <div
              className={`group-large-mark ${stableToneClass(`group:${group.id}`)}`}
              data-mark-length={groupMarkLength(group.mark)}
              aria-hidden="true"
            >
              {group.mark}
            </div>
          )}
          <div>
            <span className="eyebrow">{t("Grupo privado", "Private group")}</span>
            <h1>{group.name}</h1>
            <p>
              <Users size={16} />
              {memberships.length} {memberships.length === 1 ? t("miembro", "member") : t("miembros", "members")}
              <span aria-hidden="true">·</span>
              <Layers3 size={16} />
              {tables.length} {tables.length === 1 ? t("tabla", "table") : t("tablas", "tables")}
            </p>
          </div>
        </div>
        <nav className="group-section-nav" aria-label={t("Secciones del grupo", "Group sections")}>
          <a href="#ranking">{t("Ránking", "Leaderboard")}</a>
          <a href="#tablas">{t("Tablas", "Tables")}</a>
          <a href="#miembros">{t("Miembros", "Members")}</a>
        </nav>
      </section>

      <section className="group-overview-grid">
        <PersonalRankingScore userId={user.id} />
        <InviteCode
          code={group.invite_code}
          groupId={group.id}
          canRotate={currentMembership?.role === "owner"}
        />
      </section>

      <section className="group-members-strip" id="miembros">
        <div>
          <span className="eyebrow">{t("Acceso al grupo", "Group access")}</span>
          <h2>{t("Miembros", "Members")}</h2>
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
                  <small>{role === "owner" ? t("Creador", "Creator") : t("Miembro", "Member")}</small>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <LiveRanking
        tables={tables.map((table) => ({
          id: table.id,
          name: table.name,
          createdAt: table.created_at,
          closedAt: table.closed_date
        }))}
      />

      <section className="tables-section group-tables-section" id="tablas">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{t("Actividad del grupo", "Group activity")}</span>
            <h2>{t("Tablas", "Tables")}</h2>
          </div>
          <Link href={`/grupos/${group.id}/tablas/nueva`} className="primary-button compact-button">
            <Plus size={17} />
            {t("Nueva tabla", "New table")}
          </Link>
        </div>
        {tablesResult.error ? (
          <p className="form-message error">{t("No se pudieron cargar las tablas.", "Tables could not be loaded.")}</p>
        ) : tables.length ? (
          <TableExplorer
            groupId={group.id}
            tables={tables}
            creators={profiles.map((profile) => ({
              id: profile.id,
              username: profile.username
            }))}
          />
        ) : (
          <Link href={`/grupos/${group.id}/tablas/nueva`} className="first-table-card">
            <span>
              <Plus size={24} />
            </span>
            <div>
              <strong>{t("Crea la primera tabla del grupo", "Create the group's first table")}</strong>
              <p>{t("Define las reglas, dibuja la portada y deja constancia.", "Set the rules, draw the cover and put it on record.")}</p>
            </div>
          </Link>
        )}
      </section>
      </div>
    </RankingProvider>
  );
}
