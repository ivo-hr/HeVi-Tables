import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="centered-shell">
      <section className="setup-card offline-card">
        <span className="setup-mark">
          <WifiOff size={34} />
        </span>
        <h1>Te has quedado sin conexión</h1>
        <p>
          El ránking necesita internet para asegurar que siempre muestra los
          últimos puntos.
        </p>
        <Link href="/" className="primary-button">
          Volver a intentar
        </Link>
      </section>
    </main>
  );
}
