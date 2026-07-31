import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-shell">
      <section className="setup-card offline-card">
        <span className="setup-mark">
          <SearchX size={34} />
        </span>
        <h1>Esta tabla no existe</h1>
        <p>Puede que se haya eliminado o que el enlace no sea correcto.</p>
        <Link href="/" className="primary-button">
          Volver al ránking
        </Link>
      </section>
    </main>
  );
}
