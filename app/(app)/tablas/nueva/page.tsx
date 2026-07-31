import type { Metadata } from "next";
import { Palette } from "lucide-react";

import { ConfigurationNeeded } from "@/components/configuration-needed";
import { CreateTableForm } from "@/components/create-table-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nueva tabla"
};

export default async function NewTablePage() {
  if (!isSupabaseConfigured()) {
    return <ConfigurationNeeded />;
  }
  await requireUser();

  return (
    <div className="narrow-page create-page">
      <header className="page-heading">
        <span className="eyebrow">
          <Palette size={14} />
          Nueva tabla
        </span>
        <h1>Empieza por el lienzo.</h1>
        <p>
          Cada tabla tiene su propia portada y una regla clara para repartir los
          puntos.
        </p>
      </header>
      <CreateTableForm />
    </div>
  );
}
