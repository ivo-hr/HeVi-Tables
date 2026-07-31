"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notificaciones")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { ok: false, message: "No se pudieron marcar como leídas." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
