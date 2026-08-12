import { localeTag, type AppLocale } from "@/lib/i18n";

export type SelectableRankingPeriod = "week" | "month";

export type CalendarPeriodOption = {
  value: string;
  label: string;
};

function localDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isDateKey(value: string | undefined): value is string {
  if (!value) return false;
  const parsed = localDate(value);
  return Boolean(parsed && dateKey(parsed) === value);
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfCalendarPeriod(period: SelectableRankingPeriod, value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (period === "month") {
    start.setDate(1);
    return start;
  }
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function currentCalendarPeriodKey(
  period: SelectableRankingPeriod,
  now = new Date()
) {
  return dateKey(startOfCalendarPeriod(period, now));
}

export function calendarPeriodKey(
  period: SelectableRankingPeriod,
  value: string,
  fallback = new Date()
) {
  const date = localDate(value) ?? fallback;
  return dateKey(startOfCalendarPeriod(period, date));
}

export function calendarPeriodLabel(
  period: SelectableRankingPeriod,
  value: string,
  now = new Date(),
  locale: AppLocale = "es"
) {
  const start = startOfCalendarPeriod(period, localDate(value) ?? now);
  const current = currentCalendarPeriodKey(period, now) === dateKey(start);
  if (period === "month") {
    const label = new Intl.DateTimeFormat(localeTag(locale), {
      month: "long",
      year: "numeric"
    }).format(start);
    return `${current ? (locale === "en" ? "This month · " : "Este mes · ") : ""}${label}`;
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short"
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(localeTag(locale), {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(end);
  return `${current ? (locale === "en" ? "This week · " : "Esta semana · ") : ""}${startLabel}–${endLabel}`;
}

export function calendarPeriodOptions(
  period: SelectableRankingPeriod,
  timestamps: Array<string | null>,
  now = new Date(),
  locale: AppLocale = "es"
): CalendarPeriodOption[] {
  const current = startOfCalendarPeriod(period, now);
  const datedStarts = timestamps
    .filter((value): value is string => Boolean(value))
    .map((value) => startOfCalendarPeriod(period, new Date(value)))
    .filter((value) => !Number.isNaN(value.getTime()) && value <= current);
  const earliest = datedStarts.reduce(
    (minimum, value) => (value < minimum ? value : minimum),
    current
  );
  const minimumOptions = period === "week" ? 16 : 18;
  const maximumOptions = period === "week" ? 260 : 120;
  const options: CalendarPeriodOption[] = [];
  const cursor = new Date(current);

  while (
    options.length < maximumOptions &&
    (options.length < minimumOptions || cursor >= earliest)
  ) {
    const value = dateKey(cursor);
    options.push({ value, label: calendarPeriodLabel(period, value, now, locale) });
    if (period === "week") cursor.setDate(cursor.getDate() - 7);
    else cursor.setMonth(cursor.getMonth() - 1);
  }

  return options;
}
