import type { Metadata } from "next";
import { Mail, Settings } from "lucide-react";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { AppearanceSettings } from "@/components/appearance-settings";
import { DeviceNotificationSettings } from "@/components/device-notification-settings";
import { LanguageSettings } from "@/components/language-settings";
import { LegalDisclosure } from "@/components/legal-disclosure";
import { ProfileForm } from "@/components/profile-form";
import { getServerTranslator } from "@/lib/i18n-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return { title: t("Ajustes", "Settings") };
}

export default async function ProfilePage() {
  const { t } = await getServerTranslator();
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <section className="profile-card">
        <p className="form-message error">
          {t(
            "No existe el perfil. Aplica la migración de Supabase y vuelve a iniciar sesión.",
            "The profile does not exist. Apply the Supabase migration and sign in again."
          )}
        </p>
      </section>
    );
  }

  return (
    <div className="narrow-page profile-page">
      <header className="page-heading">
        <span className="eyebrow">
          <Settings size={14} />
          {t("Ajustes de cuenta", "Account settings")}
        </span>
        <h1>{t("Tu perfil en HeVi.", "Your HeVi profile.")}</h1>
        <p>{t("Actualiza tu nombre y la foto que aparecerá junto a tus puntos.", "Update the name and photo shown next to your points.")}</p>
      </header>
      <section className="profile-card">
        <ProfileForm profile={profile} />
        <div className="account-email">
          <Mail size={16} />
          <span>
            <small>{t("Email de acceso", "Sign-in email")}</small>
            <strong>{user.email}</strong>
          </span>
        </div>
      </section>
      <AppearanceSettings
        initialTheme={profile.theme_preference}
        initialAccent={profile.accent_color}
      />
      <LanguageSettings />
      <DeviceNotificationSettings />
      <LegalDisclosure />
    </div>
  );
}
