"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { ActionResult, Table } from "@/lib/types";
import {
  flattenZodErrors,
  rowBaseSchema,
  tableSchema,
  tableSettingsSchema
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
  const groupId = idSchema.safeParse(String(formData.get("group_id") ?? ""));
  if (!groupId.success) {
    return { ok: false, message: "Elige un grupo válido." };
  }

  const parsed = tableSchema.safeParse({
    name: formData.get("name"),
    pointSystem: formData.get("pointSystem"),
    infoFormat: formData.get("infoFormat"),
    numberSortOrder: formData.get("numberSortOrder"),
    maxPoint: formData.get("maxPoint"),
    scheduledCloseDate: String(formData.get("scheduledCloseDate") ?? ""),
    description: String(formData.get("description") ?? "")
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
  const { data: membership } = await supabase
    .from("grupo_miembros")
    .select("group_id")
    .eq("group_id", groupId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, message: "Necesitas pertenecer al grupo para crear tablas." };
  }

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
      group_id: groupId.data,
      design_url: publicUrl,
      description: parsed.data.description,
      info_format: parsed.data.infoFormat,
      number_sort_order:
        parsed.data.infoFormat === "number" ? parsed.data.numberSortOrder : null,
      scheduled_close_date: parsed.data.scheduledCloseDate
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
  revalidatePath(`/grupos/${groupId.data}`);
  redirect(`/grupos/${groupId.data}/tablas/${data.id}`);
}

async function getOwnedTable(tableId: string) {
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

  return { supabase, user, table: data } as const;
}

async function getOwnedOpenTable(tableId: string) {
  const owned = await getOwnedTable(tableId);
  if ("error" in owned) return owned;

  const { table } = owned;
  if (table.closed) {
    return { error: "La tabla ya está cerrada." } as const;
  }

  return owned;
}

async function getMemberTable(tableId: string) {
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

  const { data: membership } = await supabase
    .from("grupo_miembros")
    .select("group_id")
    .eq("group_id", data.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "Necesitas pertenecer al grupo para editar filas." } as const;
  }

  return { supabase, user, table: data } as const;
}

async function getMemberOpenTable(tableId: string) {
  const member = await getMemberTable(tableId);
  if ("error" in member) return member;

  const { table } = member;
  if (table.closed) {
    return { error: "La tabla ya está cerrada." } as const;
  }

  return member;
}

function storagePathFromPublicUrl(url: string | null, userId: string) {
  if (!url) return null;
  try {
    const marker = "/storage/v1/object/public/tablas_disenos/";
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    const path = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function updateTableSettingsAction(
  formData: FormData
): Promise<ActionResult> {
  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedTable(tableId);
  if ("error" in owned) return { ok: false, message: owned.error };

  const parsed = tableSettingsSchema.safeParse({
    scheduledCloseDate: String(formData.get("scheduledCloseDate") ?? ""),
    description: String(formData.get("description") ?? ""),
    infoFormat: formData.get("infoFormat"),
    numberSortOrder: formData.get("numberSortOrder")
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa la fecha prevista.",
      fieldErrors: flattenZodErrors(parsed.error)
    };
  }

  const design = formData.get("design");
  const hasNewDesign = design instanceof File && design.size > 0;
  if (hasNewDesign && design.type !== "image/png") {
    return { ok: false, message: "El nuevo dibujo debe ser un PNG." };
  }
  if (hasNewDesign && design.size > 5 * 1024 * 1024) {
    return { ok: false, message: "El nuevo dibujo no puede superar 5 MB." };
  }

  let designPath: string | null = null;
  let designUrl = owned.table.design_url;
  if (hasNewDesign) {
    designPath = `${owned.user.id}/${randomUUID()}.png`;
    const { error: uploadError } = await owned.supabase.storage
      .from("tablas_disenos")
      .upload(designPath, await design.arrayBuffer(), {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false
      });

    if (uploadError) {
      return {
        ok: false,
        message: safeMessage(uploadError.message, "No se pudo subir el nuevo dibujo.")
      };
    }

    const {
      data: { publicUrl }
    } = owned.supabase.storage.from("tablas_disenos").getPublicUrl(designPath);
    designUrl = publicUrl;
  }

  const { error } = await owned.supabase.rpc("update_table_settings", {
    p_table_id: owned.table.id,
    p_design_url: designUrl,
    p_scheduled_close_date: parsed.data.scheduledCloseDate,
    p_description: parsed.data.description,
    p_info_format: parsed.data.infoFormat,
    p_number_sort_order:
      parsed.data.infoFormat === "number" ? parsed.data.numberSortOrder : null
  });

  if (error) {
    if (designPath) {
      await owned.supabase.storage.from("tablas_disenos").remove([designPath]);
    }
    return {
      ok: false,
      message: safeMessage(error.message, "No se pudieron guardar los ajustes.")
    };
  }

  if (designPath) {
    const oldPath = storagePathFromPublicUrl(owned.table.design_url, owned.user.id);
    if (oldPath) {
      await owned.supabase.storage.from("tablas_disenos").remove([oldPath]);
    }
  }

  revalidatePath(`/grupos/${owned.table.group_id}/tablas/${owned.table.id}`);
  revalidatePath(`/grupos/${owned.table.group_id}`);
  return { ok: true, message: "Portada y fecha actualizadas." };
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : Number.NaN;
}

function getRowValues(formData: FormData, table: Table) {
  const base = rowBaseSchema.safeParse({
    userIds: formData.getAll("user_ids").map(String),
    notes: String(formData.get("notes") ?? ""),
    numericValue: String(formData.get("numeric_value") ?? "")
  });

  if (!base.success) {
    return {
      error: "Selecciona participantes válidos y revisa las notas.",
      fieldErrors: flattenZodErrors(base.error)
    } as const;
  }

  let position: number | null = null;
  let pointsReceivable: number | null = null;

  if (table.info_format === "number" && base.data.numericValue === null) {
    return { error: "Escribe la cantidad de este registro." } as const;
  }

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
  } else if (table.info_format === "text") {
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
      notes: table.info_format === "text" ? base.data.notes || null : null,
      numeric_value:
        table.info_format === "number" ? base.data.numericValue : null,
      position,
      points_receivable: pointsReceivable
    }
  } as const;
}

const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_SOURCE_BYTES = 10 * 1024 * 1024;

function evidenceFiles(formData: FormData) {
  return formData
    .getAll("evidence_files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function prepareEvidence(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Las evidencias deben ser imágenes.");
  }
  if (file.size > MAX_EVIDENCE_SOURCE_BYTES) {
    throw new Error("Cada imagen original puede ocupar como máximo 10 MB.");
  }

  const result = await sharp(await file.arrayBuffer())
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  if (result.info.width > 512 || result.info.height > 512) {
    throw new Error("No se pudo limitar la evidencia a 512 × 512 px.");
  }
  return result.data;
}

async function uploadEvidenceFiles(
  ctx: Exclude<Awaited<ReturnType<typeof getMemberOpenTable>>, { error: string }>,
  files: File[]
) {
  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const path = `${ctx.user.id}/${ctx.table.id}/${randomUUID()}.webp`;
      const image = await prepareEvidence(file);
      const { error } = await ctx.supabase.storage
        .from("tabla_evidencias")
        .upload(path, image, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false
        });
      if (error) throw new Error(error.message);
      uploaded.push(path);
    }
    return { paths: uploaded } as const;
  } catch (error) {
    if (uploaded.length) {
      await ctx.supabase.storage.from("tabla_evidencias").remove(uploaded);
    }
    return {
      error:
        error instanceof Error
          ? safeMessage(error.message, "No se pudieron subir las evidencias.")
          : "No se pudieron subir las evidencias."
    } as const;
  }
}

export async function addRowAction(formData: FormData): Promise<ActionResult> {
  const tableId = String(formData.get("table_id") ?? "");
  const ctx = await getMemberOpenTable(tableId);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  const values = getRowValues(formData, ctx.table);
  if ("error" in values) {
    return {
      ok: false,
      message: values.error,
      fieldErrors: values.fieldErrors
    };
  }

  const files = evidenceFiles(formData);
  if (files.length > MAX_EVIDENCE_FILES) {
    return { ok: false, message: "Cada registro admite como máximo 3 evidencias." };
  }
  const uploaded = await uploadEvidenceFiles(ctx, files);
  if ("error" in uploaded) return { ok: false, message: uploaded.error };

  const { error } = await ctx.supabase.from("tabla_filas").insert({
    table_id: ctx.table.id,
    ...values.data,
    evidence_paths: uploaded.paths
  });

  if (error) {
    if (uploaded.paths.length) {
      await ctx.supabase.storage.from("tabla_evidencias").remove(uploaded.paths);
    }
    return {
      ok: false,
      message: safeMessage(error.message, "No se pudo añadir la fila.")
    };
  }

  revalidatePath(`/grupos/${ctx.table.group_id}/tablas/${ctx.table.id}`);
  revalidatePath(`/grupos/${ctx.table.group_id}`);
  return { ok: true, message: "Fila añadida." };
}

export async function updateRowAction(
  formData: FormData
): Promise<ActionResult> {
  const rowId = idSchema.safeParse(String(formData.get("row_id") ?? ""));
  if (!rowId.success) return { ok: false, message: "Fila no válida." };

  const tableId = String(formData.get("table_id") ?? "");
  const ctx = await getMemberOpenTable(tableId);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  const { data: existingRow } = await ctx.supabase
    .from("tabla_filas")
    .select("id, table_id, evidence_paths")
    .eq("id", rowId.data)
    .eq("table_id", ctx.table.id)
    .single();

  if (!existingRow) return { ok: false, message: "No se encontró la fila." };

  const values = getRowValues(formData, ctx.table);
  if ("error" in values) {
    return {
      ok: false,
      message: values.error,
      fieldErrors: values.fieldErrors
    };
  }

  const retainedPaths = formData
    .getAll("existing_evidence_paths")
    .map(String)
    .filter((path) => existingRow.evidence_paths.includes(path));
  const files = evidenceFiles(formData);
  if (retainedPaths.length + files.length > MAX_EVIDENCE_FILES) {
    return { ok: false, message: "Cada registro admite como máximo 3 evidencias." };
  }
  const uploaded = await uploadEvidenceFiles(ctx, files);
  if ("error" in uploaded) return { ok: false, message: uploaded.error };
  const nextEvidencePaths = [...retainedPaths, ...uploaded.paths];

  const { error } = await ctx.supabase
    .from("tabla_filas")
    .update({ ...values.data, evidence_paths: nextEvidencePaths })
    .eq("id", rowId.data);

  if (error) {
    if (uploaded.paths.length) {
      await ctx.supabase.storage.from("tabla_evidencias").remove(uploaded.paths);
    }
    return {
      ok: false,
      message: safeMessage(error.message, "No se pudo actualizar la fila.")
    };
  }

  const removedPaths = existingRow.evidence_paths.filter(
    (path) => !retainedPaths.includes(path)
  );
  if (removedPaths.length) {
    await ctx.supabase.storage.from("tabla_evidencias").remove(removedPaths);
  }

  revalidatePath(`/grupos/${ctx.table.group_id}/tablas/${ctx.table.id}`);
  revalidatePath(`/grupos/${ctx.table.group_id}`);
  return { ok: true, message: "Cambios guardados." };
}

export async function deleteRowAction(
  formData: FormData
): Promise<ActionResult> {
  const rowId = idSchema.safeParse(String(formData.get("row_id") ?? ""));
  if (!rowId.success) return { ok: false, message: "Fila no válida." };

  const tableId = String(formData.get("table_id") ?? "");
  const ctx = await getMemberOpenTable(tableId);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  const { data: existingRow } = await ctx.supabase
    .from("tabla_filas")
    .select("evidence_paths")
    .eq("id", rowId.data)
    .eq("table_id", ctx.table.id)
    .maybeSingle();

  const { error } = await ctx.supabase
    .from("tabla_filas")
    .delete()
    .eq("id", rowId.data)
    .eq("table_id", ctx.table.id);

  if (error) {
    return { ok: false, message: "No se pudo eliminar la fila." };
  }

  if (existingRow?.evidence_paths.length) {
    await ctx.supabase.storage
      .from("tabla_evidencias")
      .remove(existingRow.evidence_paths);
  }

  revalidatePath(`/grupos/${ctx.table.group_id}/tablas/${ctx.table.id}`);
  revalidatePath(`/grupos/${ctx.table.group_id}`);
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

  revalidatePath(`/grupos/${owned.table.group_id}/tablas/${owned.table.id}`);
  revalidatePath(`/grupos/${owned.table.group_id}`);
  revalidatePath("/");
  return { ok: true, message: "Tabla cerrada y puntos calculados." };
}
