import type { Metadata } from "next";
import { ChevronLeft, Palette } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { CreateTableForm } from "@/components/create-table-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServerTranslator } from "@/lib/i18n-server";
import { requireUser } from "@/lib/supabase/server";

type NewTablePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return { title: t("Nueva tabla", "New table") };
}

export default async function NewTablePage({ params }: NewTablePageProps) {
  const { t } = await getServerTranslator();
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();

  const { supabase } = await requireUser();
  const { data: group } = await supabase
    .from("grupos")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!group) notFound();

  return (
    <div className="narrow-page create-page">
      <Link href={`/grupos/${group.id}#tablas`} className="back-link">
        <ChevronLeft size={17} />
        {t("Volver a", "Back to")} {group.name}
      </Link>
      <header className="page-heading">
        <span className="eyebrow">
          <Palette size={14} />
          {t("Nueva tabla", "New table")} · {group.name}
        </span>
        <h1>{t("Empieza por el lienzo.", "Start with the canvas.")}</h1>
        <p>
          {t(
            "Esta tabla será visible para el grupo. Después podrás elegir como participantes únicamente a sus miembros.",
            "This table will be visible to the group. You will then be able to choose only its members as participants."
          )}
        </p>
      </header>
      <CreateTableForm groupId={group.id} />
    </div>
  );
}
