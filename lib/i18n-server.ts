import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  isAppLocale,
  LOCALE_COOKIE,
  localize,
  type AppLocale
} from "@/lib/i18n";

export async function getAppLocale(): Promise<AppLocale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getServerTranslator() {
  const locale = await getAppLocale();
  return {
    locale,
    t: (spanish: string, english: string) => localize(locale, spanish, english)
  };
}
