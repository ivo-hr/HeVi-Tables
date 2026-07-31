import { ArrowUpRight, Crown, Layers3, Users } from "lucide-react";
import Link from "next/link";

import type { Group, GroupRole } from "@/lib/types";

type GroupCardProps = {
  group: Group;
  role: GroupRole;
  memberCount: number;
  tableCount: number;
  openTableCount: number;
};

export function GroupCard({
  group,
  role,
  memberCount,
  tableCount,
  openTableCount
}: GroupCardProps) {
  return (
    <Link href={`/grupos/${group.id}`} className="group-card">
      <div className="group-card-mark" aria-hidden="true">
        {group.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="group-card-copy">
        <span className="group-role">
          {role === "owner" ? <Crown size={13} /> : <Users size={13} />}
          {role === "owner" ? "Tu grupo" : "Miembro"}
        </span>
        <h2>{group.name}</h2>
        <div className="group-card-meta">
          <span>
            <Users size={15} />
            {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
          </span>
          <span>
            <Layers3 size={15} />
            {tableCount} {tableCount === 1 ? "tabla" : "tablas"}
          </span>
        </div>
      </div>
      <div className="group-card-tail">
        {openTableCount > 0 ? <span>{openTableCount} abiertas</span> : <span>Sin pendientes</span>}
        <ArrowUpRight size={21} />
      </div>
    </Link>
  );
}
