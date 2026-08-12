"use client";

import { useMemo, useState } from "react";
import { FilterX, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { SelectField } from "@/components/select-field";
import { TableCard } from "@/components/table-card";
import { useLanguage } from "@/components/language-provider";
import type { Profile, Table } from "@/lib/types";

type TableStatus = "all" | "open" | "closed";
type TablePeriod = "all" | "week" | "month" | "year";
type TableOrder =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "creator-asc"
  | "creator-desc"
  | "open-first"
  | "closed-first";

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

function startOfCurrentWeek(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function periodStart(period: TablePeriod, now: Date) {
  if (period === "week") return startOfCurrentWeek(now);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

export function TableExplorer({
  groupId,
  tables,
  creators
}: {
  groupId: string;
  tables: Table[];
  creators: Array<Pick<Profile, "id" | "username">>;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creatorId, setCreatorId] = useState("");
  const [status, setStatus] = useState<TableStatus>("all");
  const [period, setPeriod] = useState<TablePeriod>("all");
  const [order, setOrder] = useState<TableOrder>("newest");
  const creatorNames = useMemo(
    () => new Map(creators.map((creator) => [creator.id, creator.username])),
    [creators]
  );
  const filteredTables = useMemo(() => {
    const normalizedQuery = searchable(query.trim());
    const start = periodStart(period, new Date());
    const next = tables.filter((table) => {
      if (normalizedQuery && !searchable(table.name).includes(normalizedQuery)) return false;
      if (creatorId && table.creator_id !== creatorId) return false;
      if (status === "open" && table.closed) return false;
      if (status === "closed" && !table.closed) return false;
      if (start && new Date(table.created_at) < start) return false;
      return true;
    });

    return next.sort((left, right) => {
      if (order === "newest" || order === "oldest") {
        const difference =
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        return order === "newest" ? difference : -difference;
      }
      if (order === "name-asc" || order === "name-desc") {
        const difference = left.name.localeCompare(right.name, "es", {
          sensitivity: "base"
        });
        return order === "name-asc" ? difference : -difference;
      }
      if (order === "creator-asc" || order === "creator-desc") {
        const difference = (creatorNames.get(left.creator_id) ?? "").localeCompare(
          creatorNames.get(right.creator_id) ?? "",
          "es",
          { sensitivity: "base" }
        );
        return order === "creator-asc" ? difference : -difference;
      }
      const difference = Number(left.closed) - Number(right.closed);
      return order === "open-first" ? difference : -difference;
    });
  }, [creatorId, creatorNames, order, period, query, status, tables]);
  const hasFilters = Boolean(query || creatorId || status !== "all" || period !== "all");
  const hasCustomView = hasFilters || order !== "newest";
  const openCount = filteredTables.filter((table) => !table.closed).length;

  const reset = () => {
    setQuery("");
    setCreatorId("");
    setStatus("all");
    setPeriod("all");
    setOrder("newest");
  };

  return (
    <div className="table-explorer">
      <div className="table-explorer-heading">
        <div className="table-explorer-summary" aria-live="polite">
          <span>
            <SlidersHorizontal size={14} />
            {filteredTables.length} {filteredTables.length === 1 ? t("tabla", "table") : t("tablas", "tables")}
            {openCount ? ` · ${openCount} ${t("abiertas", "open")}` : ""}
          </span>
          {hasCustomView ? (
            <button type="button" onClick={reset}>
              <FilterX size={14} /> {t("Restablecer", "Reset")}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={hasCustomView ? "filter-reveal-button active" : "filter-reveal-button"}
          aria-label={filtersOpen ? t("Ocultar filtros de tablas", "Hide table filters") : t("Buscar y filtrar tablas", "Search and filter tables")}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <Search size={18} />
          {hasCustomView ? <span aria-hidden="true" /> : null}
        </button>
      </div>
      {filtersOpen ? <div className="table-explorer-toolbar">
        <label className="table-search-field">
          <span className="visually-hidden">{t("Buscar una tabla por nombre", "Search for a table by name")}</span>
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("Buscar por nombre…", "Search by name…")}
          />
        </label>
        <SelectField
          name="table_creator_filter"
          ariaLabel={t("Filtrar por creador", "Filter by creator")}
          value={creatorId}
          onValueChange={setCreatorId}
          options={[
            { value: "", label: t("Cualquier creador", "Any creator") },
            ...creators.map((creator) => ({ value: creator.id, label: creator.username }))
          ]}
        />
        <SelectField
          name="table_status_filter"
          ariaLabel={t("Filtrar por estado", "Filter by status")}
          value={status}
          onValueChange={(value) => setStatus(value as TableStatus)}
          options={[
            { value: "all", label: t("Abiertas y cerradas", "Open and closed") },
            { value: "open", label: t("Solo abiertas", "Open only") },
            { value: "closed", label: t("Solo cerradas", "Closed only") }
          ]}
        />
        <SelectField
          name="table_period_filter"
          ariaLabel={t("Filtrar por fecha de creación", "Filter by creation date")}
          value={period}
          onValueChange={(value) => setPeriod(value as TablePeriod)}
          options={[
            { value: "all", label: t("Cualquier fecha", "Any date") },
            { value: "week", label: t("Creadas esta semana", "Created this week") },
            { value: "month", label: t("Creadas este mes", "Created this month") },
            { value: "year", label: t("Creadas este año", "Created this year") }
          ]}
        />
        <SelectField
          name="table_order"
          ariaLabel={t("Ordenar tablas", "Sort tables")}
          value={order}
          onValueChange={(value) => setOrder(value as TableOrder)}
          options={[
            { value: "newest", label: t("Más recientes", "Newest") },
            { value: "oldest", label: t("Más antiguas", "Oldest") },
            { value: "name-asc", label: t("Nombre: A–Z", "Name: A–Z") },
            { value: "name-desc", label: t("Nombre: Z–A", "Name: Z–A") },
            { value: "creator-asc", label: t("Creador: A–Z", "Creator: A–Z") },
            { value: "creator-desc", label: t("Creador: Z–A", "Creator: Z–A") },
            { value: "open-first", label: t("Abiertas primero", "Open first") },
            { value: "closed-first", label: t("Cerradas primero", "Closed first") }
          ]}
        />
      </div> : null}
      {filteredTables.length ? (
        <div className="table-grid">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              creatorName={creatorNames.get(table.creator_id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-table-filter">
          <FilterX size={28} />
          <strong>{t("Ninguna tabla encaja", "No tables match")}</strong>
          <p>{t("Los filtros han hecho su trabajo con un entusiasmo preocupante.", "The filters have done their job with worrying enthusiasm.")}</p>
          <button type="button" className="secondary-button" onClick={reset}>
            {t("Ver todas", "View all")}
          </button>
          {!tables.length ? (
            <Link href={`/grupos/${groupId}/tablas/nueva`} className="primary-button">
              <Plus size={16} /> {t("Crear la primera", "Create the first one")}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
