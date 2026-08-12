"use client";

import { ArrowUpRight, Crown, Layers3, Users } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { groupMarkLength } from "@/lib/group-mark";
import { stableToneClass } from "@/lib/presentation";
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
  const { t } = useLanguage();
  return (
    <Link
      href={`/grupos/${group.id}`}
      className={`group-card ${stableToneClass(`group:${group.id}`)}`}
    >
      <div
        className="group-card-mark"
        data-mark-length={groupMarkLength(group.mark)}
        aria-hidden="true"
      >
        {group.mark}
      </div>
      <div className="group-card-copy">
        <span className="group-role">
          {role === "owner" ? <Crown size={13} /> : <Users size={13} />}
          {role === "owner" ? t("Tu grupo", "Your group") : t("Miembro", "Member")}
        </span>
        <h2>{group.name}</h2>
        <div className="group-card-meta">
          <span>
            <Users size={15} />
            {memberCount} {memberCount === 1 ? t("miembro", "member") : t("miembros", "members")}
          </span>
          <span>
            <Layers3 size={15} />
            {tableCount} {tableCount === 1 ? t("tabla", "table") : t("tablas", "tables")}
          </span>
        </div>
      </div>
      <div className="group-card-tail">
        {openTableCount > 0 ? <span>{openTableCount} {t("abiertas", "open")}</span> : <span>{t("Sin pendientes", "Nothing pending")}</span>}
        <ArrowUpRight size={21} />
      </div>
    </Link>
  );
}
