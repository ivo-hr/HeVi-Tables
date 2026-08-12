import { SearchX } from "lucide-react";
import Link from "next/link";
import { getServerTranslator } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t } = await getServerTranslator();
  return (
    <main className="centered-shell">
      <section className="setup-card offline-card">
        <span className="setup-mark">
          <SearchX size={34} />
        </span>
        <h1>{t("Esta página no existe", "This page does not exist")}</h1>
        <p>{t("Puede que se haya eliminado o que el enlace no sea correcto.", "It may have been removed or the link may be incorrect.")}</p>
        <Link href="/" className="primary-button">
          {t("Volver a los grupos", "Back to groups")}
        </Link>
      </section>
    </main>
  );
}
