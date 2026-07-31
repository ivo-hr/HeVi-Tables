import type { Metadata } from "next";
import { Suspense } from "react";
import { Dices, ShieldCheck, Sparkles } from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { ConfigurationNeeded } from "@/components/configuration-needed";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Entrar"
};

export default function LoginPage() {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true">
            H
          </span>
          <span>
            <strong>HeVi</strong>
            <small>tables</small>
          </span>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">
            <Sparkles size={14} />
            Predicciones con memoria
          </span>
          <h1>
            Menos mensajes.
            <br />
            Más <em>pruebas.</em>
          </h1>
          <p>
            Predicciones privadas con reglas claras, resultados cerrados y un
            ránking que recuerda quién dijo qué.
          </p>
        </div>
        <div className="auth-perks">
          <span>
            <Dices size={19} />
            Tres formas de puntuar
          </span>
          <span>
            <ShieldCheck size={19} />
            Resultados definitivos
          </span>
        </div>
      </section>
      <section className="auth-access">
        <div className="auth-access-heading">
          <span className="eyebrow">Bienvenido</span>
          <h2>Accede a tu cuenta</h2>
          <p>Usa tu email o el acceso rápido de Google.</p>
        </div>
        <Suspense fallback={<div className="auth-panel skeleton-panel" />}>
          <AuthForm />
        </Suspense>
        <small className="auth-privacy">
          Tus datos solo se usan dentro del grupo privado.
        </small>
      </section>
    </main>
  );
}
