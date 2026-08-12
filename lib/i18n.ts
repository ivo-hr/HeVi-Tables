export const APP_LOCALES = ["es", "en"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "es";
export const LOCALE_COOKIE = "hevi_locale";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && APP_LOCALES.includes(value as AppLocale);
}

export function localize(locale: AppLocale, spanish: string, english: string) {
  return locale === "en" ? english : spanish;
}

export function localeTag(locale: AppLocale) {
  return locale === "en" ? "en-GB" : "es-ES";
}

export function formatLocaleDate(
  locale: AppLocale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(localeTag(locale), options).format(
    typeof value === "string" ? new Date(value) : value
  );
}

export function formatLocaleNumber(
  locale: AppLocale,
  value: number,
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(localeTag(locale), options).format(value);
}
