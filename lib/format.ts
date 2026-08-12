import { localeTag, type AppLocale } from "@/lib/i18n";
import type { PointSystem } from "@/lib/types";

export function formatDate(value: string | null, locale: AppLocale = "es") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatPoints(value: number, locale: AppLocale = "es") {
  return new Intl.NumberFormat(localeTag(locale), {
    maximumFractionDigits: 2
  }).format(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function pointSystemLabel(pointSystem: PointSystem, locale: AppLocale = "es") {
  return {
    WtA: "Winner takes all",
    Pod: locale === "en" ? "Podium" : "Podio",
    EC: locale === "en" ? "Everything counts" : "Todo cuenta"
  }[pointSystem];
}
