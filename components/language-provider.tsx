"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  formatLocaleDate,
  formatLocaleNumber,
  localize,
  type AppLocale
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: AppLocale;
  t: (spanish: string, english: string) => string;
  date: (
    value: Date | string,
    options: Intl.DateTimeFormatOptions
  ) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  locale,
  children
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      t: (spanish, english) => localize(locale, spanish, english),
      date: (dateValue, options) => formatLocaleDate(locale, dateValue, options),
      number: (numberValue, options) =>
        formatLocaleNumber(locale, numberValue, options)
    }),
    [locale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage requires LanguageProvider.");
  return value;
}
