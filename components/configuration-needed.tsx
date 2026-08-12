"use client";

import { Database, KeyRound, TerminalSquare } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function ConfigurationNeeded() {
  const { t } = useLanguage();
  return (
    <main className="centered-shell">
      <section className="setup-card">
        <span className="eyebrow">{t("Entorno Dev", "Dev environment")}</span>
        <div className="setup-mark" aria-hidden="true">
          <Database size={34} />
        </div>
        <h1>{t("Conecta Supabase para empezar", "Connect Supabase to get started")}</h1>
        <p>
          {t(
            "La aplicación ya está preparada. Faltan los dos valores públicos del proyecto para poder autenticar usuarios y leer los datos.",
            "The application is ready. It needs the project's two public values to authenticate users and read data."
          )}
        </p>
        <ol className="setup-steps">
          <li>
            <KeyRound size={18} />
            {t("Copia", "Copy")} <code>.env.example</code> {t("como", "to")} <code>.env.local</code>.
          </li>
          <li>
            <Database size={18} />
            {t("Añade la URL y la clave pública de Supabase.", "Add the Supabase URL and public key.")}
          </li>
          <li>
            <TerminalSquare size={18} />
            {t("Aplica la migración y ejecuta", "Apply the migration and run")} <code>npm run dev</code>.
          </li>
        </ol>
        <p className="muted small">
          {t(
            "La contraseña de la base de datos no pertenece al frontend y nunca debe guardarse en Git.",
            "The database password does not belong in the frontend and must never be stored in Git."
          )}
        </p>
      </section>
    </main>
  );
}
