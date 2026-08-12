import { NextResponse } from "next/server";

import { isAppLocale, LOCALE_COOKIE, localize } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const rawLocale = url.searchParams.get("locale");
  const requestedLocale = isAppLocale(rawLocale) ? rawLocale : "es";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      let { data: profile } = user
        ? await supabase
            .from("perfiles")
            .select("locale")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };
      const isNewUser = user
        ? Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000
        : false;
      if (user && isNewUser && profile?.locale !== requestedLocale) {
        const { error: localeError } = await supabase
          .from("perfiles")
          .update({ locale: requestedLocale })
          .eq("id", user.id);
        if (!localeError) profile = { locale: requestedLocale };
      }
      const response = NextResponse.redirect(new URL(next, url.origin));
      if (profile?.locale) {
        response.cookies.set(LOCALE_COOKIE, profile.locale, {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365
        });
      }
      return response;
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set(
    "error",
    localize(requestedLocale, "No se pudo confirmar el acceso.", "Sign-in could not be confirmed.")
  );
  return NextResponse.redirect(loginUrl);
}
