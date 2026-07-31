import { Database, KeyRound, TerminalSquare } from "lucide-react";

export function ConfigurationNeeded() {
  return (
    <main className="centered-shell">
      <section className="setup-card">
        <span className="eyebrow">Entorno Dev</span>
        <div className="setup-mark" aria-hidden="true">
          <Database size={34} />
        </div>
        <h1>Conecta Supabase para empezar</h1>
        <p>
          La aplicación ya está preparada. Faltan los dos valores públicos del
          proyecto para poder autenticar usuarios y leer los datos.
        </p>
        <ol className="setup-steps">
          <li>
            <KeyRound size={18} />
            Copia <code>.env.example</code> como <code>.env.local</code>.
          </li>
          <li>
            <Database size={18} />
            Añade la URL y la clave pública de Supabase.
          </li>
          <li>
            <TerminalSquare size={18} />
            Aplica la migración y ejecuta <code>npm run dev</code>.
          </li>
        </ol>
        <p className="muted small">
          La contraseña de la base de datos no pertenece al frontend y nunca debe
          guardarse en Git.
        </p>
      </section>
    </main>
  );
}
