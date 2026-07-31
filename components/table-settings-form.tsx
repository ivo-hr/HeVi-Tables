"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, ImagePlus, LoaderCircle, Save, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateTableSettingsAction } from "@/app/actions/tables";
import {
  DrawingCanvas,
  type DrawingCanvasHandle
} from "@/components/drawing-canvas";
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
  const router = useRouter();
  const canvasRef = useRef<DrawingCanvasHandle>(null);
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
          <Settings2 size={18} />
          Ajustes de la tabla
        </span>
        <small>Cambiar dibujo y fecha prevista</small>
      </summary>
      <form
        className="table-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          startTransition(async () => {
            try {
              const formData = new FormData(form);
              if (canvasRef.current?.hasDrawing()) {
                const blob = await canvasRef.current.exportPng();
                formData.set(
                  "design",
                  new File([blob], "portada-actualizada.png", { type: "image/png" })
                );
              }
              const result = await updateTableSettingsAction(formData);
              setState(result);
              if (result.ok) router.refresh();
            } catch {
              setState({ ok: false, message: "No se pudieron guardar los ajustes." });
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
              <span>Descripción breve</span>
              <textarea
                name="description"
                defaultValue={table.description ?? ""}
                maxLength={280}
                rows={4}
                placeholder="Explica la tabla sin redactar unos estatutos."
              />
              <small className="field-help">Máximo 280 caracteres.</small>
            </label>
            <div className="field settings-format-field">
              <span>Información de los registros</span>
              <SelectField
                name="infoFormat"
                value={infoFormat}
                options={infoFormatOptions}
                onValueChange={(value) => setInfoFormat(value as EntryInfoFormat)}
                ariaLabel="Formato de información"
                disabled={hasRows}
              />
              {hasRows ? (
                <small className="field-help">
                  Ya hay registros: el formato queda bloqueado para no reinterpretarlos.
                </small>
              ) : null}
            </div>
            {infoFormat === "number" ? (
              <div className="field settings-format-field">
                <span>Orden de la cantidad</span>
                <SelectField
                  name="numberSortOrder"
                  value={numberOrder}
                  options={numberOrderOptions}
                  onValueChange={(value) => setNumberOrder(value as NumberSortOrder)}
                  ariaLabel="Orden numérico"
                  disabled={hasRows}
                />
              </div>
            ) : (
              <input type="hidden" name="numberSortOrder" value={numberOrder} />
            )}
            <label className="field">
              <span>Fecha prevista de cierre</span>
              <input
                name="scheduledCloseDate"
                type="date"
                defaultValue={table.scheduled_close_date ?? ""}
              />
              <small className="field-help">
                {table.closed
                  ? "Es informativa y no cambia la fecha real ni los puntos ya calculados."
                  : "Puedes cambiarla o dejarla vacía. No cierra la tabla automáticamente."}
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
              <strong>Nuevo dibujo</strong>
              <small>Si dejas el lienzo vacío se conservará la portada actual.</small>
            </div>
          </div>
          <DrawingCanvas ref={canvasRef} />
        </section>
        {state.message ? (
          <p className={state.ok ? "form-message success" : "form-message error"}>
            {state.message}
          </p>
        ) : null}
        <button className="primary-button settings-save-button" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
          {pending ? "Guardando…" : "Guardar ajustes"}
        </button>
      </form>
    </details>
  );
}
