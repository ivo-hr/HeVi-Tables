import { WifiOff } from "lucide-react";
import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n-server";

export default async function OfflinePage() {
  const { t } = await getServerTranslator();
  return (
    <main className="centered-shell">
      <section className="setup-card offline-card">
        <span className="setup-mark">
          <WifiOff size={34} />
        </span>
        <h1>{t("Te has quedado sin conexión", "You are offline")}</h1>
        <p>
          {t(
            "HeVi necesita internet para mostrar datos actualizados y guardar cambios.",
            "HeVi needs an internet connection to show current data and save changes."
          )}
        </p>
        <Link href="/" className="primary-button">
          {t("Volver a intentar", "Try again")}
        </Link>
      </section>
    </main>
  );
}
