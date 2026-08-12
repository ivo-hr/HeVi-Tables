"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, ImagePlus, LoaderCircle, Save, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateTableSettingsAction } from "@/app/actions/tables";
import { useLanguage } from "@/components/language-provider";
import {
  TableCoverEditor,
  type TableCoverEditorHandle
} from "@/components/table-cover-editor";
import { SelectField } from "@/components/select-field";
import type {
  ActionResult,
  EntryInfoFormat,
  NumberSortOrder,
  Table
} from "@/lib/types";

type TableSettingsFormProps = {
  table: Pick<
    Table,
    | "id"
    | "description"
    | "scheduled_close_date"
    | "closed"
    | "design_url"
    | "info_format"
    | "number_sort_order"
  >;
  hasRows: boolean;
};

const infoFormatOptions = [
  { value: "text", label: "Texto", description: "Una nota breve por registro." },
  { value: "number", label: "Número", description: "Una cantidad comparable por registro." }
] as const;

const numberOrderOptions = [
  { value: "desc", label: "Descendente", description: "De mayor a menor." },
  { value: "asc", label: "Ascendente", description: "De menor a mayor." }
] as const;

export function TableSettingsForm({ table, hasRows }: TableSettingsFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const coverRef = useRef<TableCoverEditorHandle>(null);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [infoFormat, setInfoFormat] = useState<EntryInfoFormat>(table.info_format);
  const [numberOrder, setNumberOrder] = useState<NumberSortOrder>(
    table.number_sort_order ?? "desc"
  );
  const [pending, startTransition] = useTransition();

  return (
    <details className="table-settings-panel">
      <summary>
        <span>
          <Settings2 size={15} />
          {t("Ajustes de la tabla", "Table settings")}
        </span>
        <small>{t("Portada, descripción, formato y fecha", "Cover, description, format and date")}</small>
      </summary>
      <form
        className="table-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          startTransition(async () => {
            try {
              const formData = new FormData(form);
              const cover = await coverRef.current?.exportCover();
              if (cover) formData.set("design", cover);
              const result = await updateTableSettingsAction(formData);
              setState(result);
              if (result.ok) router.refresh();
            } catch {
              setState({ ok: false, message: t("No se pudieron guardar los ajustes.", "Settings could not be saved.") });
            }
          });
        }}
      >
        <input type="hidden" name="table_id" value={table.id} />
        <section className="settings-date-block">
          <span className="settings-block-icon">
            <CalendarClock size={19} />
          </span>
          <div>
            <label className="field">
              <span>{t("Descripción breve", "Short description")}</span>
              <textarea
                name="description"
                defaultValue={table.description ?? ""}
                maxLength={280}
                rows={4}
                placeholder={t("Explica la tabla sin redactar unos estatutos.", "Explain the table without drafting a constitution.")}
              />
              <small className="field-help">{t("Máximo 280 caracteres.", "Maximum 280 characters.")}</small>
            </label>
            <div className="field settings-format-field">
              <span>{t("Información de los registros", "Entry information")}</span>
              <SelectField
                name="infoFormat"
                value={infoFormat}
                options={infoFormatOptions.map((option) => ({ ...option, label: option.value === "text" ? t("Texto", "Text") : t("Número", "Number"), description: option.value === "text" ? t("Una nota breve por registro.", "A short note for each entry.") : t("Una cantidad comparable por registro.", "A comparable quantity for each entry.") }))}
                onValueChange={(value) => setInfoFormat(value as EntryInfoFormat)}
                ariaLabel={t("Formato de información", "Information format")}
                disabled={hasRows}
              />
              {hasRows ? (
                <small className="field-help">
                  {t("Ya hay registros: el formato queda bloqueado para no reinterpretarlos.", "Entries already exist, so the format is locked to avoid reinterpreting them.")}
                </small>
              ) : null}
            </div>
            {infoFormat === "number" ? (
              <div className="field settings-format-field">
                <span>{t("Orden de la cantidad", "Quantity order")}</span>
                <SelectField
                  name="numberSortOrder"
                  value={numberOrder}
                  options={numberOrderOptions.map((option) => ({ ...option, label: option.value === "desc" ? t("Descendente", "Descending") : t("Ascendente", "Ascending"), description: option.value === "desc" ? t("De mayor a menor.", "Highest to lowest.") : t("De menor a mayor.", "Lowest to highest.") }))}
                  onValueChange={(value) => setNumberOrder(value as NumberSortOrder)}
                  ariaLabel={t("Orden numérico", "Numeric order")}
                  disabled={hasRows}
                />
              </div>
            ) : (
              <input type="hidden" name="numberSortOrder" value={numberOrder} />
            )}
            <label className="field">
              <span>{t("Fecha prevista de cierre", "Planned closing date")}</span>
              <input
                name="scheduledCloseDate"
                type="date"
                defaultValue={table.scheduled_close_date ?? ""}
              />
              <small className="field-help">
                {table.closed
                  ? t("Es informativa y no cambia la fecha real ni los puntos ya calculados.", "It is informational and does not change the actual closing date or calculated points.")
                  : t("Puedes cambiarla o dejarla vacía. No cierra la tabla automáticamente.", "You can change it or leave it empty. It does not close the table automatically.")}
              </small>
            </label>
          </div>
        </section>
        <section className="settings-drawing-block">
          <div className="settings-block-heading">
            <span className="settings-block-icon">
              <ImagePlus size={19} />
            </span>
            <div>
              <strong>{t("Nueva portada", "New cover")}</strong>
              <small>{t("Dibuja o recorta una foto. Si no cambias nada, se conserva la actual.", "Draw or crop a photo. If you make no changes, the current cover is kept.")}</small>
            </div>
          </div>
          <TableCoverEditor ref={coverRef} currentUrl={table.design_url} />
        </section>
        {state.message ? (
          <p className={state.ok ? "form-message success" : "form-message error"}>
            {state.message}
          </p>
        ) : null}
        <button className="primary-button settings-save-button" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
          {pending ? t("Guardando…", "Saving…") : t("Guardar ajustes", "Save settings")}
        </button>
      </form>
    </details>
  );
}
