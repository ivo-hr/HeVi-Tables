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
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

type TablePageProps = {
  params: Promise<{ id: string; tableId: string }>;
};

export const metadata: Metadata = {
  title: "Detalle de tabla"
};

export default async function TablePage({ params }: TablePageProps) {
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
        Volver a {groupResult.data.name}
      </Link>
      <header className="table-detail-header">
        <div className="detail-art">
          {table.design_url ? (
            <Image
              src={table.design_url}
              alt={`Portada de ${table.name}`}
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
            {table.closed ? "Cerrada" : "Abierta"}
          </span>
          <h1>{table.name}</h1>
          {table.description ? (
            <p className="table-description">{table.description}</p>
          ) : null}
          <div className="detail-stats">
            <span>
              <SlidersHorizontal size={16} />
              <b>{pointSystemLabel(table.point_system)}</b>
            </span>
            <span>
              <Crown size={16} />
              <b>{table.max_point}</b> puntos máx.
            </span>
            <span>
              {table.info_format === "number" ? <Hash size={16} /> : <TextQuote size={16} />}
              <b>{table.info_format === "number" ? "Número" : "Texto"}</b>
              {table.info_format === "number"
                ? table.number_sort_order === "asc"
                  ? " · ascendente"
                  : " · descendente"
                : null}
            </span>
            <span>
              <CalendarDays size={16} />
              {table.scheduled_close_date
                ? `Prevista ${formatDate(table.scheduled_close_date)}`
                : `Creada ${formatDate(table.created_at)}`}
            </span>
            {table.closed_date ? (
              <span>
                <LockKeyhole size={16} />
                Cerrada {formatDate(table.closed_date)}
              </span>
            ) : null}
          </div>
          {table.closed ? (
            <p className="locked-note">
              <LockKeyhole size={16} />
              Resultado definitivo. Las filas están en modo lectura.
            </p>
          ) : isMember ? (
            <p>Añade registros y sube evidencias. El creador cerrará la tabla cuando haya un resultado.</p>
          ) : (
            <p>Necesitas pertenecer al grupo para editar los registros de esta tabla.</p>
          )}
        </div>
      </header>

      {table.creator_id === user.id ? (
        <TableSettingsForm table={table} hasRows={rows.length > 0} />
      ) : null}

      <section className="rows-section">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">Participantes del grupo</span>
            <h2>{rows.length ? `${rows.length} filas` : "Sin filas todavía"}</h2>
          </div>
          {editable && isCreator ? (
            <span className="creator-badge">Eres el creador</span>
          ) : editable ? (
            <span className="creator-badge">Puedes editar</span>
          ) : null}
        </div>
        {rowsResult.error || membershipsResult.error || profilesResult.error || evidenceResult.error ? (
          <p className="form-message error">No se pudieron cargar las filas.</p>
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
    </div>
  );
}
