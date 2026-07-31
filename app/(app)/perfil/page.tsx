import type { Metadata } from "next";
import { Mail, UserRound } from "lucide-react";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { ProfileForm } from "@/components/profile-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Perfil"
};

export default async function ProfilePage() {
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
          No existe el perfil. Aplica la migración de Supabase y vuelve a iniciar
          sesión.
        </p>
      </section>
    );
  }

  return (
    <div className="narrow-page profile-page">
      <header className="page-heading">
        <span className="eyebrow">
          <UserRound size={14} />
          Tu cuenta
        </span>
        <h1>Así te ven en el ránking.</h1>
        <p>Actualiza tu nombre y la foto que aparecerá junto a tus puntos.</p>
      </header>
      <section className="profile-card">
        <ProfileForm profile={profile} />
        <div className="account-email">
          <Mail size={16} />
          <span>
            <small>Email de acceso</small>
            <strong>{user.email}</strong>
          </span>
        </div>
      </section>
    </div>
  );
}
