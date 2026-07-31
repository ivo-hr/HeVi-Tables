import { Home, LogOut, Plus, UserRound } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import type { Profile } from "@/lib/types";

type AppShellProps = {
  profile: Profile;
  children: React.ReactNode;
};

export function AppShell({ profile, children }: AppShellProps) {
  return (
    <div className="app-frame">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="HeVi Tables, inicio">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <span>
            <strong>HeVi</strong>
            <small>tables</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <Link href="/">
            <Home size={17} />
            Ránking
          </Link>
          <Link href="/tablas/nueva" className="nav-create">
            <Plus size={17} />
            Nueva tabla
          </Link>
          <Link href="/perfil">
            <Avatar
              name={profile.username}
              src={profile.avatar_url}
              size="sm"
            />
            <span className="nav-username">{profile.username}</span>
          </Link>
          <form action={signOutAction}>
            <button className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </form>
        </nav>
      </header>
      <main className="page-shell">{children}</main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        <Link href="/">
          <Home size={21} />
          <span>Ránking</span>
        </Link>
        <Link href="/tablas/nueva" className="mobile-create" aria-label="Nueva tabla">
          <Plus size={27} />
        </Link>
        <Link href="/perfil">
          <UserRound size={21} />
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  );
}
