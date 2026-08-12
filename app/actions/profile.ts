"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { prepareStoredImage } from "@/lib/image-processing";
import { getServerTranslator } from "@/lib/i18n-server";
import { stableVariant, SUCCESS_COPY, SUCCESS_COPY_EN } from "@/lib/presentation";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { flattenZodErrors, profileSchema } from "@/lib/validation";

function avatarPathFromPublicUrl(url: string | null, userId: string) {
  if (!url) return null;
  try {
    const marker = "/storage/v1/object/public/avatars/";
    const pathname = new URL(url).pathname;
    const index = pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function updateProfileAction(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const parsed = profileSchema.safeParse({
    username: formData.get("username")
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: t("Revisa el nombre.", "Check the name."),
      fieldErrors: flattenZodErrors(parsed.error, t)
    };
  }

  const { supabase, user } = await requireUser();
  const avatar = formData.get("avatar");
  let avatarUrl: string | undefined;
  let avatarPath: string | null = null;

  if (avatar instanceof File && avatar.size > 0) {
    let image: Awaited<ReturnType<typeof prepareStoredImage>>;
    try {
      image = await prepareStoredImage(avatar);
    } catch {
      return {
        ok: false,
        message: t("No pudimos preparar esa foto. Prueba con otra.", "We could not prepare that photo. Try another one.")
      };
    }

    avatarPath = `${user.id}/${randomUUID()}.${image.extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, image.data, {
        contentType: image.contentType,
        cacheControl: "31536000",
        upsert: false
      });

    if (uploadError) {
      return { ok: false, message: t("No se pudo subir el avatar.", "The avatar could not be uploaded.") };
    }

    avatarUrl = supabase.storage.from("avatars").getPublicUrl(avatarPath)
      .data.publicUrl;
  }

  const { data: currentProfile } = await supabase
    .from("perfiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const update = avatarUrl
    ? { username: parsed.data.username, avatar_url: avatarUrl }
    : { username: parsed.data.username };
  const { error } = await supabase.from("perfiles").update(update).eq("id", user.id);

  if (error) {
    if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
    return { ok: false, message: t("No se pudo actualizar el perfil.", "The profile could not be updated.") };
  }

  if (avatarUrl) {
    const previousPath = avatarPathFromPublicUrl(currentProfile?.avatar_url ?? null, user.id);
    if (previousPath) await supabase.storage.from("avatars").remove([previousPath]);
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.profileUpdated : SUCCESS_COPY.profileUpdated)
  };
}
