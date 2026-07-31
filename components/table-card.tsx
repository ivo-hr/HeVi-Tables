import { ArrowUpRight, LockKeyhole, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatDate, pointSystemLabel } from "@/lib/format";
import type { Table } from "@/lib/types";

export function TableCard({ table }: { table: Table }) {
  return (
    <Link href={`/grupos/${table.group_id}/tablas/${table.id}`} className="table-card">
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
          {table.closed ? "Cerrada" : "Abierta"}
        </span>
      </div>
      <div className="table-card-body">
        <div>
          <span className="card-kicker">{pointSystemLabel(table.point_system)}</span>
          <h3>{table.name}</h3>
          {table.description ? <p className="table-card-description">{table.description}</p> : null}
        </div>
        <span className="card-arrow">
          <ArrowUpRight size={18} />
        </span>
        <div className="table-meta">
          <span>
            <Users size={14} />
            {table.max_point} pts máx.
          </span>
          <span>
            {table.scheduled_close_date
              ? `Prev. ${formatDate(table.scheduled_close_date)}`
              : formatDate(table.closed_date ?? table.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
