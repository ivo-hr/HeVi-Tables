"use client";

import { useEffect, useState } from "react";
import { Layers3, Settings, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNavigation() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const groupMatch = pathname.match(/^\/grupos\/([0-9a-f-]+)/i);
  const groupPath = groupMatch ? `/grupos/${groupMatch[1]}` : null;

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const tablesActive = pathname.includes("/tablas") || hash === "#tablas";
  const rankingActive =
    Boolean(groupPath) && !tablesActive && (hash === "#ranking" || hash === "");

  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      <Link href="/" className={pathname === "/" ? "active" : undefined}>
        <UsersRound size={21} />
        <span>Grupos</span>
      </Link>
      <Link
        href={groupPath ? `${groupPath}#tablas` : "/#mis-grupos"}
        className={tablesActive ? "active" : undefined}
        aria-label="Tablas del grupo"
      >
        <Layers3 size={21} />
        <span>Tablas</span>
      </Link>
      <Link
        href={groupPath ? `${groupPath}#ranking` : "/#mis-grupos"}
        className={rankingActive ? "active" : undefined}
        aria-label="Ránking del grupo"
      >
        <Trophy size={21} />
        <span>Ránking</span>
      </Link>
      <Link href="/perfil" className={pathname === "/perfil" ? "active" : undefined}>
        <Settings size={21} />
        <span>Ajustes</span>
      </Link>
    </nav>
  );
}
