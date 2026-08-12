"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode
} from "react";
import {
  Activity,
  CalendarRange,
  Flame,
  LoaderCircle,
  Search,
  Trophy
} from "lucide-react";

import { Leaderboard } from "@/components/leaderboard";
import { useLanguage } from "@/components/language-provider";
import { SelectField } from "@/components/select-field";
import {
  calendarPeriodLabel,
  calendarPeriodOptions,
  currentCalendarPeriodKey
} from "@/lib/calendar-periods";
import { userRankingPosition } from "@/lib/ranking";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/types";

export type RankingPeriod = "week" | "month" | "all";

const PERIODS: Array<{ value: RankingPeriod; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "all", label: "Histórico" }
];

type RankingContextValue = {
  entries: LeaderboardEntry[];
  period: RankingPeriod;
  tableId: string;
  anchorDate: string;
  refreshing: boolean;
  error: string | null;
  updatedAt: Date | null;
  selectPeriod: (period: RankingPeriod) => void;
  selectTable: (tableId: string) => void;
  selectAnchorDate: (date: string) => void;
};

const RankingContext = createContext<RankingContextValue | null>(null);

function useRanking() {
  const value = useContext(RankingContext);
  if (!value) throw new Error("Ranking components require RankingProvider.");
  return value;
}

export function RankingProvider({
  groupId,
  initialEntries,
  initialPeriod,
  initialTableId,
  initialAnchorDate,
  initialError = null,
  children
}: {
  groupId: string;
  initialEntries: LeaderboardEntry[];
  initialPeriod: RankingPeriod;
  initialTableId: string | null;
  initialAnchorDate: string | null;
  initialError?: string | null;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState(initialEntries);
  const [period, setPeriod] = useState(initialPeriod);
  const [tableId, setTableId] = useState(initialTableId ?? "");
  const [anchorDate, setAnchorDate] = useState(
    initialPeriod === "all"
      ? ""
      : initialAnchorDate ?? currentCalendarPeriodKey(initialPeriod)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [, startTransition] = useTransition();
  const periodRef = useRef(period);
  const tableRef = useRef(tableId);
  const anchorRef = useRef(anchorDate);
  const requestRef = useRef(0);

  const loadRanking = useCallback(
    async (
      nextPeriod = periodRef.current,
      nextTableId = tableRef.current,
      nextAnchorDate = anchorRef.current
    ) => {
      const request = ++requestRef.current;
      setRefreshing(true);
      const result = await supabase.rpc("get_group_leaderboard", {
        p_group_id: groupId,
        p_period: nextPeriod,
        p_table_id: nextTableId || null,
        p_anchor_date: nextPeriod === "all" ? null : nextAnchorDate || null
      });
      if (request !== requestRef.current) return;

      if (result.error) {
        setError(t("No se pudo actualizar el ránking.", "The leaderboard could not be updated."));
      } else {
        startTransition(() => {
          setEntries((result.data ?? []) as LeaderboardEntry[]);
          setError(null);
          setUpdatedAt(new Date());
        });
      }
      setRefreshing(false);
    },
    [groupId, supabase, t]
  );

  const updateUrl = useCallback((
    nextPeriod: RankingPeriod,
    nextTableId: string,
    nextAnchorDate: string
  ) => {
    const url = new URL(window.location.href);
    url.searchParams.set("period", nextPeriod);
    if (nextTableId) url.searchParams.set("table", nextTableId);
    else url.searchParams.delete("table");
    if (nextPeriod !== "all" && nextAnchorDate) {
      url.searchParams.set("date", nextAnchorDate);
    } else {
      url.searchParams.delete("date");
    }
    url.hash = "ranking";
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  const chooseFilters = useCallback(
    (nextPeriod: RankingPeriod, nextTableId: string, nextAnchorDate: string) => {
      periodRef.current = nextPeriod;
      tableRef.current = nextTableId;
      anchorRef.current = nextAnchorDate;
      setPeriod(nextPeriod);
      setTableId(nextTableId);
      setAnchorDate(nextAnchorDate);
      updateUrl(nextPeriod, nextTableId, nextAnchorDate);
      void loadRanking(nextPeriod, nextTableId, nextAnchorDate);
    },
    [loadRanking, updateUrl]
  );

  useEffect(() => {
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void loadRanking(), 140);
    };
    const channel = supabase
      .channel(`live-ranking:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tabla_filas" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tablas",
          filter: `group_id=eq.${groupId}`
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grupo_miembros",
          filter: `group_id=eq.${groupId}`
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [groupId, loadRanking, supabase]);

  const value = useMemo<RankingContextValue>(
    () => ({
      entries,
      period,
      tableId,
      anchorDate,
      refreshing,
      error,
      updatedAt,
      selectPeriod: (nextPeriod) =>
        chooseFilters(
          nextPeriod,
          tableRef.current,
          nextPeriod === "all" ? "" : currentCalendarPeriodKey(nextPeriod)
        ),
      selectTable: (nextTableId) =>
        chooseFilters(periodRef.current, nextTableId, anchorRef.current),
      selectAnchorDate: (nextAnchorDate) =>
        chooseFilters(periodRef.current, tableRef.current, nextAnchorDate)
    }),
    [anchorDate, chooseFilters, entries, error, period, refreshing, tableId, updatedAt]
  );

  return <RankingContext.Provider value={value}>{children}</RankingContext.Provider>;
}

export function PersonalRankingScore({ userId }: { userId: string }) {
  const { locale, t } = useLanguage();
  const { entries, period, anchorDate, refreshing } = useRanking();
  const entry = entries.find((candidate) => candidate.user_id === userId);
  const position = userRankingPosition(entries, userId);
  const periodLabel =
    period === "all"
      ? t("Histórico", "All time")
      : calendarPeriodLabel(period, anchorDate, new Date(), locale);

  return (
    <aside className="personal-score group-personal-score" aria-live="polite">
      <span className="score-icon">
        <Flame size={23} />
      </span>
      <small>{t("Tu posición", "Your position")} · {periodLabel}</small>
      <strong>{position ? `#${position}` : "—"}</strong>
      <p>
        <b>{entry?.points ?? 0}</b> {t("puntos en", "points from")} {entry?.entries_count ?? 0} {t("registros", "entries")}
      </p>
      {refreshing ? <span className="score-refreshing"><LoaderCircle className="spin" size={13} /> {t("Actualizando", "Updating")}</span> : null}
    </aside>
  );
}

export function LiveRanking({
  tables
}: {
  tables: Array<{
    id: string;
    name: string;
    createdAt: string;
    closedAt: string | null;
  }>;
}) {
  const { locale, t } = useLanguage();
  const {
    entries,
    period,
    tableId,
    anchorDate,
    refreshing,
    error,
    updatedAt,
    selectPeriod,
    selectTable,
    selectAnchorDate
  } = useRanking();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectedTable = tables.find((table) => table.id === tableId);
  const calendarOptions = useMemo(
    () =>
      period === "all"
        ? []
        : calendarPeriodOptions(
            period,
            tables.map((table) => table.closedAt ?? table.createdAt),
            new Date(),
            locale
          ),
    [locale, period, tables]
  );
  const selectedPeriodLabel =
    period === "all" ? t("Histórico", "All time") : calendarPeriodLabel(period, anchorDate, new Date(), locale);
  const hasHiddenFilters = Boolean(
    tableId ||
      (period !== "all" && anchorDate !== currentCalendarPeriodKey(period))
  );

  return (
    <section
      className="ranking-section group-ranking-section live-ranking-section"
      id="ranking"
      aria-busy={refreshing}
    >
      <div className="section-title-row">
        <div>
          <span className="eyebrow">
            <Trophy size={14} /> {t("Clasificación del grupo", "Group standings")}
          </span>
          <h2>{selectedTable?.name ?? t("Ránking general", "Overall leaderboard")}</h2>
        </div>
        <button
          type="button"
          className={hasHiddenFilters ? "filter-reveal-button active" : "filter-reveal-button"}
          aria-label={filtersOpen ? t("Ocultar filtros del ránking", "Hide leaderboard filters") : t("Buscar y filtrar el ránking", "Search and filter the leaderboard")}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <Search size={18} />
          {hasHiddenFilters ? <span aria-hidden="true" /> : null}
        </button>
      </div>
      <div className="period-tabs ranking-period-tabs" role="tablist" aria-label={t("Periodo del ránking", "Leaderboard period")}>
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            className={period === item.value ? "active" : undefined}
            aria-selected={period === item.value}
            onClick={() => selectPeriod(item.value)}
          >
            {item.value === "week" ? t("Semana", "Week") : item.value === "month" ? t("Mes", "Month") : t("Histórico", "All time")}
          </button>
        ))}
      </div>
      {filtersOpen ? (
        <div className="ranking-filter-panel">
          {period !== "all" ? (
            <SelectField
              name="ranking_calendar_period"
              ariaLabel={period === "week" ? t("Semana del ránking", "Leaderboard week") : t("Mes del ránking", "Leaderboard month")}
              value={anchorDate}
              onValueChange={selectAnchorDate}
              options={calendarOptions}
            />
          ) : null}
          <SelectField
            id="table-filter"
            name="table"
            ariaLabel={t("Filtrar por tabla", "Filter by table")}
            value={tableId}
            onValueChange={selectTable}
            options={[
              { value: "", label: t("Todas las tablas", "All tables") },
              ...tables.map((table) => ({ value: table.id, label: table.name }))
            ]}
          />
        </div>
      ) : null}
      <div className="ranking-toolbar">
        <span className="ranking-period-summary">
          <CalendarRange size={14} /> {selectedPeriodLabel}
          {selectedTable ? ` · ${selectedTable.name}` : ""}
        </span>
        <span className={refreshing ? "ranking-live-status refreshing" : "ranking-live-status"}>
          {refreshing ? <LoaderCircle className="spin" size={14} /> : <Activity size={14} />}
          {refreshing
            ? t("Recalculando…", "Recalculating…")
            : updatedAt
              ? t("Actualizado al momento", "Up to date")
              : t("En directo", "Live")}
        </span>
      </div>
      {error ? <p className="form-message error">{error}</p> : <Leaderboard entries={entries} />}
    </section>
  );
}
