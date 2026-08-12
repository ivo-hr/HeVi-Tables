"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { LOCALE_COOKIE, localize, type AppLocale } from "@/lib/i18n";
import { getServerTranslator } from "@/lib/i18n-server";
import { stableVariant, SUCCESS_COPY, SUCCESS_COPY_EN } from "@/lib/presentation";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { appearanceSchema } from "@/lib/validation";

const localeSchema = z.enum(["es", "en"]);

function localeCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  };
}

export async function updateLanguageAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = localeSchema.safeParse(formData.get("locale"));
  if (!parsed.success) {
    return { ok: false, message: "Invalid language." };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("perfiles")
    .update({ locale: parsed.data })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      message: localize(
        parsed.data,
        "No se pudo guardar el idioma.",
        "The language could not be saved."
      )
    };
  }

  (await cookies()).set(LOCALE_COOKIE, parsed.data, localeCookieOptions());
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: localize(
      parsed.data,
      "Idioma guardado. La app ya habla como toca.",
      "Language saved. The app now speaks your language."
    )
  };
}

export async function syncLanguagePreferenceAction(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("perfiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = data?.locale ?? "es";
  cookieStore.set(LOCALE_COOKIE, locale, localeCookieOptions());
  return locale;
}

export async function updateAppearanceAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const parsed = appearanceSchema.safeParse({
    theme: formData.get("theme"),
    accent: formData.get("accent")
  });
  if (!parsed.success) {
    return { ok: false, message: t("La combinación de apariencia no es válida.", "That appearance combination is invalid.") };
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
    return { ok: false, message: t("No se pudo guardar la apariencia.", "The appearance could not be saved.") };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.appearanceSaved : SUCCESS_COPY.appearanceSaved)
  };
}
