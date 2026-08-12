"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getServerTranslator } from "@/lib/i18n-server";
import { stableVariant, SUCCESS_COPY, SUCCESS_COPY_EN } from "@/lib/presentation";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(256),
  userAgent: z.string().max(500)
});

export async function savePushSubscriptionAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const parsed = subscriptionSchema.safeParse({
    endpoint: formData.get("endpoint"),
    p256dh: formData.get("p256dh"),
    auth: formData.get("auth"),
    userAgent: String(formData.get("userAgent") ?? "")
  });
  if (!parsed.success) {
    return { ok: false, message: t("El navegador devolvió una suscripción no válida.", "The browser returned an invalid subscription.") };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.userAgent || null
    },
    { onConflict: "endpoint" }
  );

  return error
    ? { ok: false, message: t("No se pudo guardar este dispositivo.", "This device could not be saved.") }
    : {
        ok: true,
        message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.pushEnabled : SUCCESS_COPY.pushEnabled)
      };
}

export async function deletePushSubscriptionAction(
  formData: FormData
): Promise<ActionResult> {
  const { locale, t } = await getServerTranslator();
  const endpoint = z.url().max(2048).safeParse(formData.get("endpoint"));
  if (!endpoint.success) {
    return { ok: false, message: t("No se encontró la suscripción del dispositivo.", "The device subscription could not be found.") };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint.data);

  return error
    ? { ok: false, message: t("No se pudo desactivar este dispositivo.", "This device could not be disabled.") }
    : {
        ok: true,
        message: stableVariant(randomUUID(), locale === "en" ? SUCCESS_COPY_EN.pushDisabled : SUCCESS_COPY.pushDisabled)
      };
}
