"use client";

import { useEffect, useState } from "react";
import { Layers3, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";

export function MobileNavigation() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const groupMatch = pathname.match(/^\/grupos\/([0-9a-f-]+)/i);
  const groupPath = groupMatch ? `/grupos/${groupMatch[1]}` : null;

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    const frame = window.requestAnimationFrame(updateHash);
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, [pathname]);

  const groupLanding = Boolean(groupPath) && pathname === groupPath;
  const tablesActive = pathname.includes("/tablas") || (groupLanding && hash !== "#ranking");
  const rankingActive = groupLanding && hash === "#ranking";

  return (
    <nav className="mobile-nav" aria-label={t("Navegación móvil", "Mobile navigation")}>
      <Link href="/" className={pathname === "/" ? "active" : undefined}>
        <UsersRound size={21} />
        <span>{t("Grupos", "Groups")}</span>
      </Link>
      <Link
        href={groupPath ? `${groupPath}#tablas` : "/#mis-grupos"}
        className={tablesActive ? "active" : undefined}
        aria-current={tablesActive ? "page" : undefined}
        aria-label={t("Tablas del grupo", "Group tables")}
        onClick={() => setHash("#tablas")}
      >
        <Layers3 size={21} />
        <span>{t("Tablas", "Tables")}</span>
      </Link>
      <Link
        href={groupPath ? `${groupPath}#ranking` : "/#mis-grupos"}
        className={rankingActive ? "active" : undefined}
        aria-current={rankingActive ? "page" : undefined}
        aria-label={t("Ránking del grupo", "Group leaderboard")}
        onClick={() => setHash("#ranking")}
      >
        <Trophy size={21} />
        <span>{t("Ránking", "Leaderboard")}</span>
      </Link>
      <Link href="/perfil" className={pathname === "/perfil" ? "active" : undefined}>
        <Settings size={21} />
        <span>{t("Ajustes", "Settings")}</span>
      </Link>
    </nav>
  );
}
