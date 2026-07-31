import type { Metadata } from "next";
import { ChevronLeft, Palette } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { CreateTableForm } from "@/components/create-table-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

type NewTablePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Nueva tabla"
};

export default async function NewTablePage({ params }: NewTablePageProps) {
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
        Volver a {group.name}
      </Link>
      <header className="page-heading">
        <span className="eyebrow">
          <Palette size={14} />
          Nueva tabla · {group.name}
        </span>
        <h1>Empieza por el lienzo.</h1>
        <p>
          Esta tabla será visible para el grupo. Después podrás elegir como
          participantes únicamente a sus miembros.
        </p>
      </header>
      <CreateTableForm groupId={group.id} />
    </div>
  );
}
