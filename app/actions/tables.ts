"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prepareStoredImage } from "@/lib/image-processing";
import { getServerTranslator } from "@/lib/i18n-server";
import { stableVariant, SUCCESS_COPY, SUCCESS_COPY_EN } from "@/lib/presentation";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult, Table } from "@/lib/types";
import {
  flattenZodErrors,
  rowBaseSchema,
  tableSchema,
  tableSettingsSchema
} from "@/lib/validation";

const idSchema = z.uuid();
type Translator = (spanish: string, english: string) => string;

function safeMessage(message: string, fallback: string, useFallback = false) {
  if (
    useFallback ||
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
  const { locale, t } = await getServerTranslator();
  const groupId = idSchema.safeParse(String(formData.get("group_id") ?? ""));
  if (!groupId.success) {
    return { ok: false, message: t("Elige un grupo válido.", "Choose a valid group.") };
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
      message: t("Revisa los campos marcados.", "Check the highlighted fields."),
      fieldErrors: flattenZodErrors(parsed.error, t)
    };
  }

  const design = formData.get("design");
  if (!(design instanceof File) || design.size === 0) {
    return { ok: false, message: t("Añade un dibujo o una foto de portada.", "Add a drawing or cover photo.") };
  }

  const { supabase, user } = await requireUser();
  const { data: membership } = await supabase
    .from("grupo_miembros")
    .select("group_id")
    .eq("group_id", groupId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, message: t("Necesitas pertenecer al grupo para crear tablas.", "You must belong to the group to create tables.") };
  }

  let preparedDesign: Awaited<ReturnType<typeof prepareStoredImage>>;
  try {
    preparedDesign = await prepareStoredImage(design);
  } catch {
    return {
      ok: false,
      message: t("No pudimos preparar la portada. Prueba con otra imagen.", "We could not prepare the cover. Try another image.")
    };
  }

  const designPath = `${user.id}/${randomUUID()}.${preparedDesign.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("tablas_disenos")
    .upload(designPath, preparedDesign.data, {
      contentType: preparedDesign.contentType,
      cacheControl: "31536000",
      upsert: false
    });

  if (uploadError) {
    return {
      ok: false,
      message: safeMessage(uploadError.message, t("No se pudo subir la portada.", "The cover could not be uploaded."), locale === "en")
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
      message: safeMessage(error?.message ?? "", t("No se pudo crear la tabla.", "The table could not be created."), locale === "en")
    };
  }

  revalidatePath("/");
  revalidatePath(`/grupos/${groupId.data}`);
  redirect(`/grupos/${groupId.data}/tablas/${data.id}`);
}

async function getOwnedTable(tableId: string, t: Translator) {
  const parsedId = idSchema.safeParse(tableId);
  if (!parsedId.success) {
    return { error: t("Tabla no válida.", "Invalid table.") } as const;
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("tablas")
    .select("*")
    .eq("id", parsedId.data)
    .single();

  if (error || !data) {
    return { error: t("No se encontró la tabla.", "The table could not be found.") } as const;
  }
  if (data.creator_id !== user.id) {
    return { error: t("Solo el creador puede editar esta tabla.", "Only the creator can edit this table.") } as const;
  }

  return { supabase, user, table: data } as const;
}

async function getOwnedOpenTable(tableId: string, t: Translator) {
  const owned = await getOwnedTable(tableId, t);
  if ("error" in owned) return owned;

  const { table } = owned;
  if (table.closed) {
    return { error: t("La tabla ya está cerrada.", "The table is already closed.") } as const;
  }

  return owned;
}

async function getMemberTable(tableId: string, t: Translator) {
  const parsedId = idSchema.safeParse(tableId);
  if (!parsedId.success) {
    return { error: t("Tabla no válida.", "Invalid table.") } as const;
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("tablas")
    .select("*")
    .eq("id", parsedId.data)
    .single();

  if (error || !data) {
    return { error: t("No se encontró la tabla.", "The table could not be found.") } as const;
  }

  const { data: membership } = await supabase
    .from("grupo_miembros")
    .select("group_id")
    .eq("group_id", data.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: t("Necesitas pertenecer al grupo para editar filas.", "You must belong to the group to edit entries.") } as const;
  }

  return { supabase, user, table: data } as const;
}

async function getMemberOpenTable(tableId: string, t: Translator) {
  const member = await getMemberTable(tableId, t);
  if ("error" in member) return member;

  const { table } = member;
  if (table.closed) {
    return { error: t("La tabla ya está cerrada.", "The table is already closed.") } as const;
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
  const { locale, t } = await getServerTranslator();
  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedTable(tableId, t);
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
      message: t("Revisa los ajustes marcados.", "Check the highlighted settings."),
      fieldErrors: flattenZodErrors(parsed.error, t)
    };
  }

  const design = formData.get("design");
  const hasNewDesign = design instanceof File && design.size > 0;

  let designPath: string | null = null;
  let designUrl = owned.table.design_url;
  if (hasNewDesign) {
    let preparedDesign: Awaited<ReturnType<typeof prepareStoredImage>>;
    try {
      preparedDesign = await prepareStoredImage(design);
    } catch {
      return {
        ok: false,
        message: t("No pudimos preparar la portada. Prueba con otra imagen.", "We could not prepare the cover. Try another image.")
      };
    }
    designPath = `${owned.user.id}/${randomUUID()}.${preparedDesign.extension}`;
    const { error: uploadError } = await owned.supabase.storage
      .from("tablas_disenos")
      .upload(designPath, preparedDesign.data, {
        contentType: preparedDesign.contentType,
        cacheControl: "31536000",
        upsert: false
      });

    if (uploadError) {
      return {
        ok: false,
        message: safeMessage(uploadError.message, t("No se pudo subir la nueva portada.", "The new cover could not be uploaded."), locale === "en")
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
      message: safeMessage(error.message, t("No se pudieron guardar los ajustes.", "Settings could not be saved."), locale === "en")
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
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.tableSettings : SUCCESS_COPY.tableSettings)
  };
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : Number.NaN;
}

function getRowValues(formData: FormData, table: Table, t: Translator) {
  const base = rowBaseSchema.safeParse({
    userIds: formData.getAll("user_ids").map(String),
    notes: String(formData.get("notes") ?? ""),
    numericValue: String(formData.get("numeric_value") ?? "")
  });

  if (!base.success) {
    return {
      error: t("Selecciona participantes válidos y revisa las notas.", "Select valid participants and check the entry details."),
      fieldErrors: flattenZodErrors(base.error, t)
    } as const;
  }

  let position: number | null = null;
  let pointsReceivable: number | null = null;

  if (table.info_format === "number" && base.data.numericValue === null) {
    return { error: t("Escribe la cantidad de este registro.", "Enter the value for this entry.") } as const;
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
        error: t(`Los puntos deben estar entre 0 y ${table.max_point}.`, `Points must be between 0 and ${table.max_point}.`)
      } as const;
    }
  } else if (table.info_format === "text") {
    position = parseOptionalInteger(formData.get("position"));
    if (
      table.point_system === "Pod" &&
      (position === null || !Number.isFinite(position) || position < 1)
    ) {
      return { error: t("Indica una posición positiva.", "Enter a positive position.") } as const;
    }
    if (
      table.point_system === "WtA" &&
      position !== null &&
      position !== 1
    ) {
      return { error: t("En WtA una fila solo puede marcarse como ganadora.", "In winner-takes-all, an entry can only be marked as the winner.") } as const;
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

function evidenceFiles(formData: FormData) {
  return formData
    .getAll("evidence_files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function prepareEvidence(file: File) {
  return prepareStoredImage(file);
}

async function uploadEvidenceFiles(
  ctx: Exclude<Awaited<ReturnType<typeof getMemberOpenTable>>, { error: string }>,
  files: File[],
  t: Translator,
  useFallback: boolean
) {
  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const path = `${ctx.user.id}/${ctx.table.id}/${randomUUID()}.webp`;
      const image = await prepareEvidence(file);
      const { error } = await ctx.supabase.storage
        .from("tabla_evidencias")
        .upload(path, image.data, {
          contentType: image.contentType,
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
          ? safeMessage(error.message, t("No se pudieron subir las evidencias.", "The evidence could not be uploaded."), useFallback)
          : t("No se pudieron subir las evidencias.", "The evidence could not be uploaded.")
    } as const;
  }
}

export async function addRowAction(formData: FormData): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const tableId = String(formData.get("table_id") ?? "");
  const ctx = await getMemberOpenTable(tableId, t);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  const values = getRowValues(formData, ctx.table, t);
  if ("error" in values) {
    return {
      ok: false,
      message: values.error,
      fieldErrors: values.fieldErrors
    };
  }

  const files = evidenceFiles(formData);
  if (files.length > MAX_EVIDENCE_FILES) {
    return { ok: false, message: t("Cada registro admite como máximo 3 evidencias.", "Each entry supports up to 3 pieces of evidence.") };
  }
  const uploaded = await uploadEvidenceFiles(ctx, files, t, locale === "en");
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
      message: safeMessage(error.message, t("No se pudo añadir la fila.", "The entry could not be added."), locale === "en")
    };
  }

  revalidatePath(`/grupos/${ctx.table.group_id}/tablas/${ctx.table.id}`);
  revalidatePath(`/grupos/${ctx.table.group_id}`);
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.rowAdded : SUCCESS_COPY.rowAdded)
  };
}

export async function updateRowAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const rowId = idSchema.safeParse(String(formData.get("row_id") ?? ""));
  if (!rowId.success) return { ok: false, message: t("Fila no válida.", "Invalid entry.") };

  const tableId = String(formData.get("table_id") ?? "");
  const ctx = await getMemberOpenTable(tableId, t);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  const { data: existingRow } = await ctx.supabase
    .from("tabla_filas")
    .select("id, table_id, evidence_paths")
    .eq("id", rowId.data)
    .eq("table_id", ctx.table.id)
    .single();

  if (!existingRow) return { ok: false, message: t("No se encontró la fila.", "The entry could not be found.") };

  const values = getRowValues(formData, ctx.table, t);
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
    return { ok: false, message: t("Cada registro admite como máximo 3 evidencias.", "Each entry supports up to 3 pieces of evidence.") };
  }
  const uploaded = await uploadEvidenceFiles(ctx, files, t, locale === "en");
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
      message: safeMessage(error.message, t("No se pudo actualizar la fila.", "The entry could not be updated."), locale === "en")
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
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.rowUpdated : SUCCESS_COPY.rowUpdated)
  };
}

export async function deleteRowAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const rowId = idSchema.safeParse(String(formData.get("row_id") ?? ""));
  if (!rowId.success) return { ok: false, message: t("Fila no válida.", "Invalid entry.") };

  const tableId = String(formData.get("table_id") ?? "");
  const ctx = await getMemberOpenTable(tableId, t);
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
    return { ok: false, message: t("No se pudo eliminar la fila.", "The entry could not be deleted.") };
  }

  if (existingRow?.evidence_paths.length) {
    await ctx.supabase.storage
      .from("tabla_evidencias")
      .remove(existingRow.evidence_paths);
  }

  revalidatePath(`/grupos/${ctx.table.group_id}/tablas/${ctx.table.id}`);
  revalidatePath(`/grupos/${ctx.table.group_id}`);
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.rowDeleted : SUCCESS_COPY.rowDeleted)
  };
}

export async function closeTableAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const tableId = String(formData.get("table_id") ?? "");
  const owned = await getOwnedOpenTable(tableId, t);
  if ("error" in owned) return { ok: false, message: owned.error };

  const { error } = await owned.supabase.rpc("close_table", {
    p_table_id: owned.table.id
  });

  if (error) {
    return {
      ok: false,
      message: safeMessage(error.message, t("No se pudo cerrar la tabla.", "The table could not be closed."), locale === "en")
    };
  }

  revalidatePath(`/grupos/${owned.table.group_id}/tablas/${owned.table.id}`);
  revalidatePath(`/grupos/${owned.table.group_id}`);
  revalidatePath("/");
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.tableClosed : SUCCESS_COPY.tableClosed)
  };
}
