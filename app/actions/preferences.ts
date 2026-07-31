"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { appearanceSchema } from "@/lib/validation";

export async function updateAppearanceAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = appearanceSchema.safeParse({
    theme: formData.get("theme"),
    accent: formData.get("accent")
  });
  if (!parsed.success) {
    return { ok: false, message: "La combinación de apariencia no es válida." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("perfiles")
    .update({
      theme_preference: parsed.data.theme,
      accent_color: parsed.data.accent
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "No se pudo guardar la apariencia." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Apariencia guardada." };
}
