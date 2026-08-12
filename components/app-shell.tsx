"use client";

import { LogOut, Plus, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { signOutAction } from "@/app/actions/auth";
import { syncLanguagePreferenceAction } from "@/app/actions/preferences";
import { Avatar } from "@/components/avatar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { NotificationMenu } from "@/components/notification-menu";
import { useLanguage } from "@/components/language-provider";
import { ThemeController } from "@/components/theme-controller";
import type { Notification, Profile } from "@/lib/types";

type AppShellProps = {
  profile: Profile;
  userId: string;
  notifications: Notification[];
  children: React.ReactNode;
};

export function AppShell({ profile, userId, notifications, children }: AppShellProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (profile.locale === locale) return;
    void syncLanguagePreferenceAction().then(() => router.refresh());
  }, [locale, profile.locale, router]);

  return (
    <div className="app-frame">
      <ThemeController
        theme={profile.theme_preference}
        accent={profile.accent_color}
      />
      <header className="topbar">
        <Link href="/" className="brand" aria-label={t("HeVi Tables, inicio", "HeVi Tables, home")}>
          <span className="brand-mark" aria-hidden="true">
            <Image src="/brand/logo.png" alt="" width={48} height={48} priority />
          </span>
          <span>
            <strong>HeVi</strong>
            <small>tables</small>
          </span>
        </Link>
        <div className="topbar-tools">
          <NotificationMenu userId={userId} initialNotifications={notifications} />
          <nav className="desktop-nav" aria-label={t("Navegación principal", "Main navigation")}>
            <Link href="/">
              <UsersRound size={17} />
              {t("Mis grupos", "My groups")}
            </Link>
            <Link href="/#nuevo-grupo" className="nav-create">
              <Plus size={17} />
              {t("Nuevo grupo", "New group")}
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
              <button className="icon-button" aria-label={t("Cerrar sesión", "Sign out")} title={t("Cerrar sesión", "Sign out")}>
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
