import { ArrowUpRight, LockKeyhole, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { formatDate, pointSystemLabel } from "@/lib/format";
import { stableToneClass } from "@/lib/presentation";
import type { Table } from "@/lib/types";

export function TableCard({
  table,
  creatorName
}: {
  table: Table;
  creatorName?: string;
}) {
  const { locale, t } = useLanguage();
  return (
    <Link
      href={`/grupos/${table.group_id}/tablas/${table.id}`}
      className={`table-card ${stableToneClass(`table:${table.id}`)}`}
    >
      <div className="table-card-art">
        {table.design_url ? (
          <Image
            src={table.design_url}
            alt=""
            fill
            sizes="(max-width: 700px) 80vw, 280px"
            unoptimized
          />
        ) : (
          <span aria-hidden="true">{table.name.slice(0, 1)}</span>
        )}
        <span className={table.closed ? "status closed" : "status open"}>
          {table.closed ? <LockKeyhole size={12} /> : null}
          {table.closed ? t("Cerrada", "Closed") : t("Abierta", "Open")}
        </span>
      </div>
      <div className="table-card-body">
        <div>
          <span className="card-kicker">{pointSystemLabel(table.point_system, locale)}</span>
          <h3>{table.name}</h3>
          {table.description ? <p className="table-card-description">{table.description}</p> : null}
        </div>
        <span className="card-arrow">
          <ArrowUpRight size={18} />
        </span>
        <div className="table-meta">
          <span>
            <Users size={14} />
            {table.max_point} {t("pts máx.", "max pts")}
          </span>
          <span>
            {table.scheduled_close_date
              ? `${t("Prev.", "Due")} ${formatDate(table.scheduled_close_date, locale)}`
              : formatDate(table.closed_date ?? table.created_at, locale)}
          </span>
          {creatorName ? <span className="table-card-creator">{t("por", "by")} {creatorName}</span> : null}
        </div>
      </div>
    </Link>
  );
}
