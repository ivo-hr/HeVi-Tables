import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LegalDisclosure } from "@/components/legal-disclosure";
import { getServerTranslator } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("Privacidad y condiciones", "Privacy and terms"),
    description: t(
      "Aviso legal, privacidad, cookies y condiciones de uso de HeVi.",
      "HeVi legal notice, privacy, cookies and terms of use."
    )
  };
}

export default async function LegalPage() {
  const { t } = await getServerTranslator();
  return (
    <main className="legal-page">
      <Link href="/login" className="brand" aria-label={t("Volver a HeVi", "Back to HeVi")}>
        <span className="brand-mark" aria-hidden="true">
          <Image src="/brand/logo.png" alt="" width={48} height={48} priority />
        </span>
        <span>
          <strong>HeVi</strong>
          <small>tables</small>
        </span>
      </Link>
      <LegalDisclosure />
    </main>
  );
}
