import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Dices, ShieldCheck, Sparkles } from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { ConfigurationNeeded } from "@/components/configuration-needed";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServerTranslator } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return { title: t("Entrar", "Sign in") };
}

export default async function LoginPage() {
  const { t } = await getServerTranslator();
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <Image src="/brand/logo.png" alt="" width={48} height={48} priority />
          </span>
          <span>
            <strong>HeVi</strong>
            <small>tables</small>
          </span>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">
            <Sparkles size={14} />
            {t("Predicciones con memoria", "Predictions with a memory")}
          </span>
          <h1>
            {t("Menos mensajes.", "Fewer messages.")}
            <br />
            {t("Más", "More")} <em>{t("pruebas.", "evidence.")}</em>
          </h1>
          <p>
            {t(
              "Predicciones privadas con reglas claras, resultados cerrados y un ránking que recuerda quién dijo qué.",
              "Private predictions with clear rules, final results and a leaderboard that remembers who said what."
            )}
          </p>
        </div>
        <div className="auth-perks">
          <span>
            <Dices size={19} />
            {t("Tres formas de puntuar", "Three scoring systems")}
          </span>
          <span>
            <ShieldCheck size={19} />
            {t("Resultados definitivos", "Final results")}
          </span>
        </div>
      </section>
      <section className="auth-access">
        <div className="auth-access-heading">
          <span className="eyebrow">{t("Bienvenido", "Welcome")}</span>
          <h2>{t("Accede a tu cuenta", "Sign in to your account")}</h2>
          <p>{t("Usa tu email o el acceso rápido de Google.", "Use your email or sign in quickly with Google.")}</p>
        </div>
        <Suspense fallback={<div className="auth-panel skeleton-panel" />}>
          <AuthForm />
        </Suspense>
        <small className="auth-privacy">
          {t("Al continuar confirmas que has leído las", "By continuing, you confirm that you have read the")} {" "}
          <a href="/legal">{t("condiciones de uso y la política de privacidad", "terms of use and privacy policy")}</a>.
        </small>
      </section>
    </main>
  );
}
