"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { ActionResult, Table } from "@/lib/types";
import {
  flattenZodErrors,
  rowBaseSchema,
  tableSchema
} from "@/lib/validation";

const idSchema = z.uuid("Identificador no válido.");

function safeMessage(message: string, fallback: string) {
  if (
    message.includes("duplicate") ||
    message.includes("violates") ||
    message.includes("permission denied")
  ) {
    return fallback;
  }
  return message || fallback;
}

export async function createTableAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = tableSchema.safeParse({
    name: formData.get("name"),
    pointSystem: formData.get("pointSystem"),
    maxPoint: formData.get("maxPoint")
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }

  const design = formData.get("design");
  if (!(design instanceof File) || design.size === 0) {
    return { ok: false, message: "No se pudo preparar el dibujo." };
  }
  if (design.type !== "image/png") {
    return { ok: false, message: "El dibujo debe ser un PNG." };
  }
  if (design.size > 5 * 1024 * 1024) {
    return { ok: false, message: "El dibujo no puede superar 5 MB." };
  }

  const { supabase, user } = await requireUser();
  const designPath = `${user.id}/${randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from("tablas_disenos")
    .upload(designPath, await design.arrayBuffer(), {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false
    });

  if (uploadError) {
    return {
      ok: false,
      message: safeMessage(uploadError.message, "No se pudo subir el dibujo.")
    };
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from("tablas_disenos").getPublicUrl(designPath);

  const { data, error } = await supabase
    .from("tablas")
    .insert({
      name: parsed.data.name,
      point_system: parsed.data.pointSystem,
      max_point: parsed.data.maxPoint,
      creator_id: user.id,
      design_url: publicUrl
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from("tablas_disenos").remove([designPath]);
    return {
      ok: false,
      message: safeMessage(error?.message ?? "", "No se pudo crear la tabla.")
    };
  }

  revalidatePath("/");
  redirect(`/tablas/${data.id}`);
}

async function getOwnedOpenTable(tableId: string) {
  const parsedId = idSchema.safeParse(tableId);
  if (!parsedId.success) {
    return { error: "Tabla no válida." } as const;
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("tablas")
    .select("*")
    .eq("id", parsedId.data)
    .single();

  if (error || !data) {
    return { error: "No se encontró la tabla." } as const;
  }
  if (data.creator_id !== user.id) {
    return { error: "Solo el creador puede editar esta tabla." } as const;
  }
  if (data.closed) {
    return { error: "La tabla ya está cerrada." } as const;
  }

  return { supabase, table: data } as const;
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : Number.NaN;
}

function getRowValues(formData: FormData, table: Table) {
  const base = rowBaseSchema.safeParse({
    userIds: formData.getAll("user_ids").map(String),
    notes: String(formData.get("notes") ?? "")
  });

  if (!base.success) {
    return {
      error: "Selecciona participantes válidos y revisa las notas.",
      fieldErrors: flattenZodErrors(base.error)
    } as const;
  }

  let position: number | null = null;
  let pointsReceivable: number | null = null;

  if (table.point_system === "EC") {
    pointsReceivable = parseOptionalInteger(formData.get("points_receivable"));
    if (
      pointsReceivable === null ||
      !Number.isFinite(pointsReceivable) ||
      pointsReceivable < 0 ||
      pointsReceivable > table.max_point
    ) {
      return {
        error: `Los puntos deben estar entre 0 y ${table.max_point}.`
      } as const;
    }
  } else {
    position = parseOptionalInteger(formData.get("position"));
    if (
      table.point_system === "Pod" &&
      (position === null || !Number.isFinite(position) || position < 1)
    ) {
      return { error: "Indica una posición positiva." } as const;
    }
    if (
      table.point_system === "WtA" &&
      position !== null &&
      position !== 1
    ) {
      return { error: "En WtA una fila solo puede marcarse como ganadora." } as const;
    }
  }

  return {
    data: {
      user_ids: base.data.userIds,
      notes: base.data.notes || null,
      position,
      points_receivable: pointsReceivable
    }
  } as const;
}

export async function addRowAction(formData: FormData): Promise<ActionResult> {
  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedOpenTable(tableId);
  if ("error" in owned) return { ok: false, message: owned.error };

  const values = getRowValues(formData, owned.table);
  if ("error" in values) {
    return {
      ok: false,
      message: values.error,
      fieldErrors: values.fieldErrors
    };
  }

  const { error } = await owned.supabase.from("tabla_filas").insert({
    table_id: owned.table.id,
    ...values.data
  });

  if (error) {
    return {
      ok: false,
      message: safeMessage(error.message, "No se pudo añadir la fila.")
    };
  }

  revalidatePath(`/tablas/${owned.table.id}`);
  return { ok: true, message: "Fila añadida." };
}

export async function updateRowAction(
  formData: FormData
): Promise<ActionResult> {
  const rowId = idSchema.safeParse(String(formData.get("row_id") ?? ""));
  if (!rowId.success) return { ok: false, message: "Fila no válida." };

  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedOpenTable(tableId);
  if ("error" in owned) return { ok: false, message: owned.error };

  const { data: existingRow } = await owned.supabase
    .from("tabla_filas")
    .select("id, table_id")
    .eq("id", rowId.data)
    .eq("table_id", owned.table.id)
    .single();

  if (!existingRow) return { ok: false, message: "No se encontró la fila." };

  const values = getRowValues(formData, owned.table);
  if ("error" in values) {
    return {
      ok: false,
      message: values.error,
      fieldErrors: values.fieldErrors
    };
  }

  const { error } = await owned.supabase
    .from("tabla_filas")
    .update(values.data)
    .eq("id", rowId.data);

  if (error) {
    return {
      ok: false,
      message: safeMessage(error.message, "No se pudo actualizar la fila.")
    };
  }

  revalidatePath(`/tablas/${owned.table.id}`);
  return { ok: true, message: "Cambios guardados." };
}

export async function deleteRowAction(
  formData: FormData
): Promise<ActionResult> {
  const rowId = idSchema.safeParse(String(formData.get("row_id") ?? ""));
  if (!rowId.success) return { ok: false, message: "Fila no válida." };

  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedOpenTable(tableId);
  if ("error" in owned) return { ok: false, message: owned.error };

  const { error } = await owned.supabase
    .from("tabla_filas")
    .delete()
    .eq("id", rowId.data)
    .eq("table_id", owned.table.id);

  if (error) {
    return { ok: false, message: "No se pudo eliminar la fila." };
  }

  revalidatePath(`/tablas/${owned.table.id}`);
  return { ok: true, message: "Fila eliminada." };
}

export async function closeTableAction(
  formData: FormData
): Promise<ActionResult> {
  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedOpenTable(tableId);
  if ("error" in owned) return { ok: false, message: owned.error };

  const { error } = await owned.supabase.rpc("close_table", {
    p_table_id: owned.table.id
  });

  if (error) {
    return {
      ok: false,
      message: safeMessage(error.message, "No se pudo cerrar la tabla.")
    };
  }

  revalidatePath(`/tablas/${owned.table.id}`);
  revalidatePath("/");
  return { ok: true, message: "Tabla cerrada y puntos calculados." };
}
