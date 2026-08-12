"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowRight, CircleHelp, LoaderCircle } from "lucide-react";

import { createTableAction } from "@/app/actions/tables";
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
  PointSystem
} from "@/lib/types";

const systemDescriptions: Record<PointSystem, string> = {
  WtA: "Una única fila gana todos los puntos.",
  Pod: "El primero recibe el máximo; cada posición resta 2.",
  EC: "Asigna manualmente los puntos de cada fila."
};

const pointSystemOptions = [
  { value: "WtA", label: "Winner takes all", description: systemDescriptions.WtA },
  { value: "Pod", label: "Podio", description: systemDescriptions.Pod },
  { value: "EC", label: "Todo cuenta", description: systemDescriptions.EC }
] as const;

const infoFormatOptions = [
  { value: "text", label: "Texto", description: "Una nota breve por registro." },
  { value: "number", label: "Número", description: "Una cantidad comparable por registro." }
] as const;

const numberOrderOptions = [
  { value: "desc", label: "Descendente", description: "100 va antes que 10." },
  { value: "asc", label: "Ascendente", description: "10 va antes que 100." }
] as const;

export function CreateTableForm({ groupId }: { groupId: string }) {
  const { t } = useLanguage();
  const localizedSystemDescriptions: Record<PointSystem, string> = {
    WtA: t("Una única fila gana todos los puntos.", "A single entry wins all the points."),
    Pod: t("El primero recibe el máximo; cada posición resta 2.", "First place gets the maximum; each position subtracts 2."),
    EC: t("Asigna manualmente los puntos de cada fila.", "Assign points to each entry manually.")
  };
  const coverRef = useRef<TableCoverEditorHandle>(null);
  const [system, setSystem] = useState<PointSystem>("WtA");
  const [infoFormat, setInfoFormat] = useState<EntryInfoFormat>("text");
  const [numberOrder, setNumberOrder] = useState<NumberSortOrder>("desc");
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="create-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        startTransition(async () => {
          try {
            const cover = await coverRef.current?.exportCover();
            if (!cover) {
              setState({ ok: false, message: t("Dibuja o elige una foto de portada.", "Draw or choose a cover photo.") });
              return;
            }
            const formData = new FormData(form);
            formData.set("design", cover);
            const result = await createTableAction(formData);
            setState(result);
          } catch {
            setState({ ok: false, message: t("No se pudo crear la tabla.", "The table could not be created.") });
          }
        });
      }}
    >
      <input type="hidden" name="group_id" value={groupId} />
      <section className="form-section canvas-section">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <h2>{t("Dale una portada", "Give it a cover")}</h2>
            <p>{t("Dibújala o sube una foto. Nosotros nos ocupamos de prepararla.", "Draw one or upload a photo. We will prepare it.")}</p>
          </div>
        </div>
        <TableCoverEditor ref={coverRef} required />
      </section>

      <section className="form-section config-section">
        <div className="section-heading">
          <span className="step-number">02</span>
          <div>
            <h2>{t("Define las reglas", "Set the rules")}</h2>
            <p>{t("Podrás añadir participantes en la siguiente pantalla.", "You can add participants on the next screen.")}</p>
          </div>
        </div>
        <label className="field">
          <span>{t("Nombre de la tabla", "Table name")}</span>
          <input
            name="name"
            maxLength={80}
            placeholder={t("Predicciones del viaje", "Trip predictions")}
            autoComplete="off"
            required
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          />
          {state.fieldErrors?.name ? (
            <small className="field-error" id="name-error">
              {state.fieldErrors.name[0]}
            </small>
          ) : null}
        </label>
        <label className="field">
          <span>{t("Descripción breve", "Short description")}</span>
          <textarea
            name="description"
            maxLength={280}
            placeholder={t("Qué se decide, qué cuenta y por qué acabaréis discutiendo.", "What is being decided, what counts and why everyone will end up arguing.")}
            rows={3}
          />
          <small className="field-help">{t("Máximo 280 caracteres.", "Maximum 280 characters.")}</small>
        </label>
        <div className="field">
          <span>{t("Sistema de puntos", "Scoring system")}</span>
          <SelectField
            name="pointSystem"
            value={system}
            options={pointSystemOptions.map((option) => ({
              ...option,
              label: option.value === "Pod" ? t("Podio", "Podium") : option.value === "EC" ? t("Todo cuenta", "Everything counts") : option.label,
              description: localizedSystemDescriptions[option.value]
            }))}
            onValueChange={(value) => setSystem(value as PointSystem)}
            ariaLabel={t("Sistema de puntos", "Scoring system")}
          />
          <small className="field-help">
            <CircleHelp size={14} />
            {localizedSystemDescriptions[system]}
          </small>
        </div>
        <div className="field">
          <span>{t("Información de cada registro", "Information for each entry")}</span>
          <SelectField
            name="infoFormat"
            value={infoFormat}
            options={infoFormatOptions.map((option) => ({ ...option, label: option.value === "text" ? t("Texto", "Text") : t("Número", "Number"), description: option.value === "text" ? t("Una nota breve por registro.", "A short note for each entry.") : t("Una cantidad comparable por registro.", "A comparable quantity for each entry.") }))}
            onValueChange={(value) => setInfoFormat(value as EntryInfoFormat)}
            ariaLabel={t("Formato de información", "Information format")}
          />
          <small className="field-help">
            <CircleHelp size={14} />
            {t("El formato queda fijado al añadir el primer registro.", "The format is locked after the first entry is added.")}
          </small>
        </div>
        {infoFormat === "number" ? (
          <div className="field">
            <span>{t("Orden de la cantidad", "Quantity order")}</span>
            <SelectField
              name="numberSortOrder"
              value={numberOrder}
              options={numberOrderOptions.map((option) => ({
                ...option,
                label: option.value === "desc" ? t("Descendente", "Descending") : t("Ascendente", "Ascending"),
                description: option.value === "desc" ? t("100 va antes que 10.", "100 comes before 10.") : t("10 va antes que 100.", "10 comes before 100.")
              }))}
              onValueChange={(value) => setNumberOrder(value as NumberSortOrder)}
              ariaLabel={t("Orden numérico", "Numeric order")}
            />
          </div>
        ) : (
          <input type="hidden" name="numberSortOrder" value={numberOrder} />
        )}
        <label className="field">
          <span>{t("Puntos máximos", "Maximum points")}</span>
          <div className="number-input">
            <input
              name="maxPoint"
              type="number"
              min={1}
              max={100000}
              step={1}
              defaultValue={10}
              required
            />
            <span>pts</span>
          </div>
          {state.fieldErrors?.maxPoint ? (
            <small className="field-error">{state.fieldErrors.maxPoint[0]}</small>
          ) : null}
        </label>
        <label className="field">
          <span>{t("Fecha prevista de cierre", "Planned closing date")}</span>
          <input name="scheduledCloseDate" type="date" />
          <small className="field-help">
            <CircleHelp size={14} />
            {t("Es informativa y podrás cambiarla después.", "It is informational and can be changed later.")}
          </small>
        </label>
        {state.message ? (
          <p className={state.ok ? "form-message success" : "form-message error"}>
            {state.message}
          </p>
        ) : null}
        <button className="primary-button create-submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={19} /> : null}
          {pending ? t("Creando…", "Creating…") : t("Crear tabla", "Create table")}
          {!pending ? <ArrowRight size={19} /> : null}
        </button>
      </section>
    </form>
  );
}
