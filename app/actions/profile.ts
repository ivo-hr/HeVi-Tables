"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { flattenZodErrors, profileSchema } from "@/lib/validation";

const avatarTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

export async function updateProfileAction(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    username: formData.get("username")
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa el nombre.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }

  const { supabase, user } = await requireUser();
  const avatar = formData.get("avatar");
  let avatarUrl: string | undefined;

  if (avatar instanceof File && avatar.size > 0) {
    const extension = avatarTypes[avatar.type];
    if (!extension) {
      return { ok: false, message: "El avatar debe ser PNG, JPG o WebP." };
    }
    if (avatar.size > 2 * 1024 * 1024) {
      return { ok: false, message: "El avatar no puede superar 2 MB." };
    }

    const avatarPath = `${user.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, await avatar.arrayBuffer(), {
        contentType: avatar.type,
        cacheControl: "31536000",
        upsert: false
      });

    if (uploadError) {
      return { ok: false, message: "No se pudo subir el avatar." };
    }

    avatarUrl = supabase.storage.from("avatars").getPublicUrl(avatarPath)
      .data.publicUrl;
  }

  const update = avatarUrl
    ? { username: parsed.data.username, avatar_url: avatarUrl }
    : { username: parsed.data.username };
  const { error } = await supabase.from("perfiles").update(update).eq("id", user.id);

  if (error) {
    return { ok: false, message: "No se pudo actualizar el perfil." };
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  return { ok: true, message: "Perfil actualizado." };
}
