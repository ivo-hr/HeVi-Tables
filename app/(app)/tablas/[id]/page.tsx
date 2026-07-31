import type { Metadata } from "next";
import {
  CalendarDays,
  ChevronLeft,
  Crown,
  LockKeyhole,
  SlidersHorizontal
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { RowEditor } from "@/components/row-editor";
import { formatDate, pointSystemLabel } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

type TablePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Detalle de tabla"
};

export default async function TablePage({ params }: TablePageProps) {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();

  const { supabase, user } = await requireUser();
  const [tableResult, rowsResult, profilesResult] = await Promise.all([
    supabase.from("tablas").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("tabla_filas")
      .select("*")
      .eq("table_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("perfiles").select("*").order("username", { ascending: true })
  ]);

  if (tableResult.error || !tableResult.data) notFound();
  const table = tableResult.data;
  const rows = rowsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const editable = table.creator_id === user.id && !table.closed;

  return (
    <div className="narrow-page table-detail-page">
      <Link href="/" className="back-link">
        <ChevronLeft size={17} />
        Volver al ránking
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
              <CalendarDays size={16} />
              {formatDate(table.closed_date ?? table.created_at)}
            </span>
          </div>
          {table.closed ? (
            <p className="locked-note">
              <LockKeyhole size={16} />
              Resultado definitivo. Las filas están en modo lectura.
            </p>
          ) : table.creator_id === user.id ? (
            <p>Añade las apuestas y cierra la tabla cuando sepáis el resultado.</p>
          ) : (
            <p>Solo el creador puede editar las apuestas de esta tabla.</p>
          )}
        </div>
      </header>

      <section className="rows-section">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">Participantes</span>
            <h2>{rows.length ? `${rows.length} filas` : "Sin filas todavía"}</h2>
          </div>
          {editable ? <span className="creator-badge">Eres el creador</span> : null}
        </div>
        {rowsResult.error || profilesResult.error ? (
          <p className="form-message error">No se pudieron cargar las filas.</p>
        ) : (
          <RowEditor
            table={table}
            rows={rows}
            profiles={profiles}
            editable={editable}
          />
        )}
      </section>
    </div>
  );
}
