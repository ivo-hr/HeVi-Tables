import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/supabase/server";

type LegacyTablePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyTablePage({ params }: LegacyTablePageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();

  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("tablas")
    .select("group_id")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  redirect(`/grupos/${data.group_id}/tablas/${id}`);
}
