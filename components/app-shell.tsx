import { LogOut, Plus, UsersRound } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { NotificationMenu } from "@/components/notification-menu";
import { ThemeController } from "@/components/theme-controller";
import type { Notification, Profile } from "@/lib/types";

type AppShellProps = {
  profile: Profile;
  userId: string;
  notifications: Notification[];
  children: React.ReactNode;
};

export function AppShell({ profile, userId, notifications, children }: AppShellProps) {
  return (
    <div className="app-frame">
      <ThemeController
        theme={profile.theme_preference}
        accent={profile.accent_color}
      />
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
        <div className="topbar-tools">
          <NotificationMenu userId={userId} initialNotifications={notifications} />
          <nav className="desktop-nav" aria-label="Navegación principal">
            <Link href="/">
              <UsersRound size={17} />
              Mis grupos
            </Link>
            <Link href="/#nuevo-grupo" className="nav-create">
              <Plus size={17} />
              Nuevo grupo
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
        </div>
      </header>
      <main className="page-shell">{children}</main>
      <MobileNavigation />
    </div>
  );
}
