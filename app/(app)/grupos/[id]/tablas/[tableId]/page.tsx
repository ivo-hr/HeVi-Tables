import type { Metadata } from "next";
import {
  CalendarDays,
  ChevronLeft,
  Crown,
  Hash,
  LockKeyhole,
  SlidersHorizontal,
  TextQuote
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { RowEditor } from "@/components/row-editor";
import { TableSettingsForm } from "@/components/table-settings-form";
import { formatDate, pointSystemLabel } from "@/lib/format";
import { getServerTranslator } from "@/lib/i18n-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

type TablePageProps = {
  params: Promise<{ id: string; tableId: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return { title: t("Detalle de tabla", "Table details") };
}

export default async function TablePage({ params }: TablePageProps) {
  const { locale, t } = await getServerTranslator();
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { id: groupId, tableId: id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(groupId) ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)
  ) {
    notFound();
  }

  const { supabase, user } = await requireUser();
  const [groupResult, tableResult, rowsResult, membershipsResult] =
    await Promise.all([
      supabase.from("grupos").select("id, name").eq("id", groupId).maybeSingle(),
      supabase
        .from("tablas")
        .select("*")
        .eq("id", id)
        .eq("group_id", groupId)
        .maybeSingle(),
      supabase
        .from("tabla_filas")
        .select("*")
        .eq("table_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("grupo_miembros")
        .select("user_id")
        .eq("group_id", groupId)
    ]);

  if (groupResult.error || !groupResult.data || tableResult.error || !tableResult.data) {
    notFound();
  }

  const memberIds = (membershipsResult.data ?? []).map((member) => member.user_id);
  const profilesResult = memberIds.length
    ? await supabase
        .from("perfiles")
        .select("*")
        .in("id", memberIds)
        .order("username", { ascending: true })
    : { data: [], error: null };
  const table = tableResult.data;
  const rows = rowsResult.data ?? [];
  const evidencePaths = rows.flatMap((row) => row.evidence_paths);
  const evidenceResult = evidencePaths.length
    ? await supabase.storage
        .from("tabla_evidencias")
        .createSignedUrls(evidencePaths, 60 * 60)
    : { data: [], error: null };
  const evidenceUrls = Object.fromEntries(
    (evidenceResult.data ?? []).flatMap((item) =>
      item.signedUrl ? [[item.path, item.signedUrl]] : []
    )
  );
  const profiles = profilesResult.data ?? [];
  const isMember = memberIds.includes(user.id);
  const isCreator = table.creator_id === user.id;
  const editable = isMember && !table.closed;

  return (
    <div className="narrow-page table-detail-page">
      <Link href={`/grupos/${groupId}#tablas`} className="back-link">
        <ChevronLeft size={17} />
        {t("Volver a", "Back to")} {groupResult.data.name}
      </Link>
      <header className="table-detail-header">
        <div className="detail-art">
          {table.design_url ? (
            <Image
              src={table.design_url}
              alt={`${t("Portada de", "Cover for")} ${table.name}`}
              fill
              priority
              sizes="(max-width: 700px) 100vw, 420px"
              unoptimized
            />
          ) : (
            <span>{table.name.slice(0, 1)}</span>
          )}
        </div>
        <div className="detail-copy">
          <span className={table.closed ? "status closed" : "status open"}>
            {table.closed ? <LockKeyhole size={12} /> : null}
            {table.closed ? t("Cerrada", "Closed") : t("Abierta", "Open")}
          </span>
          <h1>{table.name}</h1>
          {table.description ? (
            <p className="table-description">{table.description}</p>
          ) : null}
          <div className="detail-stats">
            <span>
              <SlidersHorizontal size={16} />
              <b>{pointSystemLabel(table.point_system, locale)}</b>
            </span>
            <span>
              <Crown size={16} />
              <b>{table.max_point}</b> {t("puntos máx.", "max points")}
            </span>
            <span>
              {table.info_format === "number" ? <Hash size={16} /> : <TextQuote size={16} />}
              <b>{table.info_format === "number" ? t("Número", "Number") : t("Texto", "Text")}</b>
              {table.info_format === "number"
                ? table.number_sort_order === "asc"
                  ? t(" · ascendente", " · ascending")
                  : t(" · descendente", " · descending")
                : null}
            </span>
            <span>
              <CalendarDays size={16} />
              {table.scheduled_close_date
                ? `${t("Prevista", "Due")} ${formatDate(table.scheduled_close_date, locale)}`
                : `${t("Creada", "Created")} ${formatDate(table.created_at, locale)}`}
            </span>
            {table.closed_date ? (
              <span>
                <LockKeyhole size={16} />
                {t("Cerrada", "Closed")} {formatDate(table.closed_date, locale)}
              </span>
            ) : null}
          </div>
          {table.closed ? (
            <p className="locked-note">
              <LockKeyhole size={16} />
              {t("Resultado definitivo. Las filas están en modo lectura.", "Final result. Entries are read-only.")}
            </p>
          ) : isMember ? (
            <p>{t("Añade registros y sube evidencias. El creador cerrará la tabla cuando haya un resultado.", "Add entries and upload evidence. The creator will close the table once there is a result.")}</p>
          ) : (
            <p>{t("Necesitas pertenecer al grupo para editar los registros de esta tabla.", "You need to belong to the group to edit this table's entries.")}</p>
          )}
        </div>
      </header>

      <section className="rows-section">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{t("Participantes del grupo", "Group participants")}</span>
            <h2>{rows.length ? `${rows.length} ${rows.length === 1 ? t("fila", "entry") : t("filas", "entries")}` : t("Sin filas todavía", "No entries yet")}</h2>
          </div>
          {editable && isCreator ? (
            <span className="creator-badge">{t("Eres el creador", "You are the creator")}</span>
          ) : editable ? (
            <span className="creator-badge">{t("Puedes editar", "You can edit")}</span>
          ) : null}
        </div>
        {rowsResult.error || membershipsResult.error || profilesResult.error || evidenceResult.error ? (
          <p className="form-message error">{t("No se pudieron cargar las filas.", "Entries could not be loaded.")}</p>
        ) : (
          <RowEditor
            table={table}
            rows={rows}
            profiles={profiles}
            editable={editable}
            isCreator={isCreator}
            evidenceUrls={evidenceUrls}
          />
        )}
      </section>

      {table.creator_id === user.id ? (
        <TableSettingsForm table={table} hasRows={rows.length > 0} />
      ) : null}
    </div>
  );
}
