import { describe, expect, it } from "vitest";

import {
  calendarPeriodKey,
  calendarPeriodLabel,
  calendarPeriodOptions,
  currentCalendarPeriodKey,
  isDateKey
} from "./calendar-periods";

const NOW = new Date(2026, 7, 12, 12);

describe("calendar ranking periods", () => {
  it("uses Monday and the first day of the month", () => {
    expect(currentCalendarPeriodKey("week", NOW)).toBe("2026-08-10");
    expect(currentCalendarPeriodKey("month", NOW)).toBe("2026-08-01");
  });

  it("normalizes deep links to their calendar period", () => {
    expect(calendarPeriodKey("week", "2026-08-12", NOW)).toBe("2026-08-10");
    expect(calendarPeriodKey("month", "2026-08-12", NOW)).toBe("2026-08-01");
  });

  it("rejects normalized but impossible calendar dates", () => {
    expect(isDateKey("2026-08-03")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
  });

  it("labels current and historical periods", () => {
    expect(calendarPeriodLabel("week", "2026-08-10", NOW)).toContain("Esta semana");
    expect(calendarPeriodLabel("month", "2026-07-01", NOW)).toBe("julio de 2026");
  });

  it("offers the current period first and includes periods containing old tables", () => {
    const options = calendarPeriodOptions("month", ["2024-02-12T10:00:00Z"], NOW);
    expect(options[0].value).toBe("2026-08-01");
    expect(options.some((option) => option.value === "2024-02-01")).toBe(true);
  });
});
