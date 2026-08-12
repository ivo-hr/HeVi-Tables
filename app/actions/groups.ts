"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import { getServerTranslator } from "@/lib/i18n-server";
import { stableVariant, SUCCESS_COPY, SUCCESS_COPY_EN } from "@/lib/presentation";
import type { ActionResult } from "@/lib/types";
import {
  flattenZodErrors,
  groupMarkSchema,
  groupSchema,
  inviteCodeSchema
} from "@/lib/validation";

const idSchema = z.uuid();

function groupError(message: string, fallback: string, t: (es: string, en: string) => string) {
  if (message.includes("código de invitación")) {
    return t("Ese código no existe o ya no está activo.", "That code does not exist or is no longer active.");
  }
  if (message.includes("Solo el creador")) {
    return t("Solo el creador puede renovar el código.", "Only the creator can rotate the code.");
  }
  return fallback;
}

export async function createGroupAction(
  formData: FormData
): Promise<ActionResult> {
  const { t } = await getServerTranslator();
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    mark: formData.get("mark")
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: t("Revisa el nombre y el símbolo del grupo.", "Check the group name and symbol."),
      fieldErrors: flattenZodErrors(parsed.error, t)
    };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name,
    p_mark: parsed.data.mark
  });

  if (error || !data) {
    return {
      ok: false,
      message: groupError(error?.message ?? "", t("No se pudo crear el grupo.", "The group could not be created."), t)
    };
  }

  revalidatePath("/");
  redirect(`/grupos/${data}`);
}

export async function updateGroupIdentityAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const groupId = idSchema.safeParse(String(formData.get("group_id") ?? ""));
  const mark = groupMarkSchema.safeParse(formData.get("mark"));
  if (!groupId.success || !mark.success) {
    return { ok: false, message: t("Usa entre uno y tres símbolos, sin espacios.", "Use one to three symbols with no spaces.") };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("grupos")
    .update({ mark: mark.data })
    .eq("id", groupId.data)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: t("No se pudieron cambiar las siglas. Solo puede hacerlo quien creó el grupo.", "The group mark could not be changed. Only the group creator can do that.")
    };
  }

  revalidatePath("/");
  revalidatePath(`/grupos/${groupId.data}`);
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.groupIdentity : SUCCESS_COPY.groupIdentity)
  };
}

export async function joinGroupAction(
  formData: FormData
): Promise<ActionResult> {
  const { t } = await getServerTranslator();
  const parsed = inviteCodeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!parsed.success) {
    return {
      ok: false,
      message: t("Revisa el código.", "Check the code.")
    };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("join_group_by_code", {
    p_code: parsed.data
  });

  if (error || !data) {
    return {
      ok: false,
      message: groupError(error?.message ?? "", t("No se pudo entrar al grupo.", "The group could not be joined."), t)
    };
  }

  revalidatePath("/");
  redirect(`/grupos/${data}`);
}

export async function rotateInviteCodeAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const groupId = idSchema.safeParse(String(formData.get("group_id") ?? ""));
  if (!groupId.success) {
    return { ok: false, message: t("Grupo no válido.", "Invalid group.") };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("rotate_group_invite_code", {
    p_group_id: groupId.data
  });

  if (error) {
    return {
      ok: false,
      message: groupError(error.message, t("No se pudo renovar el código.", "The code could not be rotated."), t)
    };
  }

  revalidatePath(`/grupos/${groupId.data}`);
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.inviteRenewed : SUCCESS_COPY.inviteRenewed)
  };
}
