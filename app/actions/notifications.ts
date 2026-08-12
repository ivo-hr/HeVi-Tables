"use server";

import { revalidatePath } from "next/cache";

import { getServerTranslator } from "@/lib/i18n-server";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const { t } = await getServerTranslator();
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notificaciones")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { ok: false, message: t("No se pudieron marcar como leídas.", "Notifications could not be marked as read.") };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
