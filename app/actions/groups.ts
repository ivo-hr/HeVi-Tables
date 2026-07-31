"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  flattenZodErrors,
  groupSchema,
  inviteCodeSchema
} from "@/lib/validation";

const idSchema = z.uuid();

function groupError(message: string, fallback: string) {
  if (message.includes("código de invitación")) {
    return "Ese código no existe o ya no está activo.";
  }
  if (message.includes("Solo el creador")) {
    return "Solo el creador puede renovar el código.";
  }
  return fallback;
}

export async function createGroupAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = groupSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Ponle un nombre al grupo.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: parsed.data.name
  });

  if (error || !data) {
    return {
      ok: false,
      message: groupError(error?.message ?? "", "No se pudo crear el grupo.")
    };
  }

  revalidatePath("/");
  redirect(`/grupos/${data}`);
}

export async function joinGroupAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = inviteCodeSchema.safeParse(String(formData.get("code") ?? ""));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revisa el código."
    };
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("join_group_by_code", {
    p_code: parsed.data
  });

  if (error || !data) {
    return {
      ok: false,
      message: groupError(error?.message ?? "", "No se pudo entrar al grupo.")
    };
  }

  revalidatePath("/");
  redirect(`/grupos/${data}`);
}

export async function rotateInviteCodeAction(
  formData: FormData
): Promise<ActionResult> {
  const groupId = idSchema.safeParse(String(formData.get("group_id") ?? ""));
  if (!groupId.success) {
    return { ok: false, message: "Grupo no válido." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("rotate_group_invite_code", {
    p_group_id: groupId.data
  });

  if (error) {
    return {
      ok: false,
      message: groupError(error.message, "No se pudo renovar el código.")
    };
  }

  revalidatePath(`/grupos/${groupId.data}`);
  return { ok: true, message: "Código renovado." };
}
