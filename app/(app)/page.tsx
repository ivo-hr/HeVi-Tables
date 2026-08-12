import { ArrowDown, Sparkles, UsersRound } from "lucide-react";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { GroupCard } from "@/components/group-card";
import { GroupForm } from "@/components/group-forms";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServerTranslator } from "@/lib/i18n-server";
import { requireUser } from "@/lib/supabase/server";

export default async function GroupsHome() {
  const { t } = await getServerTranslator();
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { supabase, user } = await requireUser();
  const membershipsResult = await supabase
    .from("grupo_miembros")
    .select("*")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const memberships = membershipsResult.data ?? [];
  const groupIds = memberships.map((membership) => membership.group_id);
  const [groupsResult, allMembersResult, tablesResult] = groupIds.length
    ? await Promise.all([
        supabase
          .from("grupos")
          .select("*")
          .in("id", groupIds)
          .order("created_at", { ascending: true }),
        supabase
          .from("grupo_miembros")
          .select("group_id, user_id")
          .in("group_id", groupIds),
        supabase
          .from("tablas")
          .select("id, group_id, closed")
          .in("group_id", groupIds)
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null }
      ];

  const groups = groupsResult.data ?? [];
  const allMembers = allMembersResult.data ?? [];
  const tables = tablesResult.data ?? [];
  const hasLoadError =
    membershipsResult.error || groupsResult.error || allMembersResult.error || tablesResult.error;

  return (
    <div className="groups-home">
      <section className="groups-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            {t("Tus grupos", "Your groups")}
          </span>
          <h1>
            {t("Organiza el caos.", "Organise the chaos.")}
            <br />
            {t("Luego,", "Then,")} <em>{t("los datos.", "the data.")}</em>
          </h1>
          <p>
            {t(
              "Cada grupo mantiene sus tablas, su ránking y sus decisiones cuestionables en un mismo sitio.",
              "Each group keeps its tables, leaderboard and questionable decisions in one place."
            )}
          </p>
          <a href="#mis-grupos" className="hero-text-link">
            {t("Ver mis grupos", "View my groups")} <ArrowDown size={17} />
          </a>
        </div>
        <div className="groups-hero-orbit" aria-hidden="true">
          <span className="orbit-main">
            <UsersRound size={46} />
          </span>
          <span className="orbit-dot dot-one" />
          <span className="orbit-dot dot-two" />
          <span className="orbit-dot dot-three" />
        </div>
      </section>

      <section className="my-groups-section" id="mis-grupos">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{t("Tus espacios", "Your spaces")}</span>
            <h2>{t("Mis grupos", "My groups")}</h2>
          </div>
          {groups.length ? <span className="open-count">{groups.length} {t("activos", "active")}</span> : null}
        </div>

        {hasLoadError ? (
          <p className="form-message error">
            {t("No se pudieron cargar los grupos. Comprueba que la nueva migración esté aplicada.", "Groups could not be loaded. Check that the latest migration has been applied.")}
          </p>
        ) : groups.length ? (
          <div className="groups-grid">
            {groups.map((group) => {
              const membership = memberships.find((item) => item.group_id === group.id);
              const groupTables = tables.filter((table) => table.group_id === group.id);
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  role={membership?.role ?? "member"}
                  memberCount={allMembers.filter((item) => item.group_id === group.id).length}
                  tableCount={groupTables.length}
                  openTableCount={groupTables.filter((table) => !table.closed).length}
                />
              );
            })}
          </div>
        ) : (
          <div className="empty-groups">
            <UsersRound size={36} />
            <h2>{t("Aquí aparecerán tus grupos", "Your groups will appear here")}</h2>
            <p>{t("Crea uno nuevo o entra con el código que te pase un amigo.", "Create one or join with a code shared by a friend.")}</p>
          </div>
        )}
      </section>

      <section className="group-actions-grid" aria-label={t("Añadir un grupo", "Add a group")}>
        <GroupForm mode="create" />
        <GroupForm mode="join" />
      </section>
    </div>
  );
}
