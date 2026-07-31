"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowRight, CircleHelp, LoaderCircle } from "lucide-react";

import { createTableAction } from "@/app/actions/tables";
import {
  DrawingCanvas,
  type DrawingCanvasHandle
} from "@/components/drawing-canvas";
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
  const canvasRef = useRef<DrawingCanvasHandle>(null);
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
            const blob = await canvasRef.current?.exportPng();
            if (!blob) {
              setState({ ok: false, message: "No se pudo preparar el dibujo." });
              return;
            }
            const formData = new FormData(form);
            formData.set("design", new File([blob], "portada.png", { type: "image/png" }));
            const result = await createTableAction(formData);
            setState(result);
          } catch {
            setState({ ok: false, message: "No se pudo crear la tabla." });
          }
        });
      }}
    >
      <input type="hidden" name="group_id" value={groupId} />
      <section className="form-section canvas-section">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <h2>Dale una portada</h2>
            <p>Dibuja una portada. Los trazos se suavizan automáticamente.</p>
          </div>
        </div>
        <DrawingCanvas ref={canvasRef} />
      </section>

      <section className="form-section config-section">
        <div className="section-heading">
          <span className="step-number">02</span>
          <div>
            <h2>Define las reglas</h2>
            <p>Podrás añadir participantes en la siguiente pantalla.</p>
          </div>
        </div>
        <label className="field">
          <span>Nombre de la tabla</span>
          <input
            name="name"
            maxLength={80}
            placeholder="Predicciones del viaje"
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
          <span>Descripción breve</span>
          <textarea
            name="description"
            maxLength={280}
            placeholder="Qué se decide, qué cuenta y por qué acabaréis discutiendo."
            rows={3}
          />
          <small className="field-help">Máximo 280 caracteres.</small>
        </label>
        <div className="field">
          <span>Sistema de puntos</span>
          <SelectField
            name="pointSystem"
            value={system}
            options={pointSystemOptions}
            onValueChange={(value) => setSystem(value as PointSystem)}
            ariaLabel="Sistema de puntos"
          />
          <small className="field-help">
            <CircleHelp size={14} />
            {systemDescriptions[system]}
          </small>
        </div>
        <div className="field">
          <span>Información de cada registro</span>
          <SelectField
            name="infoFormat"
            value={infoFormat}
            options={infoFormatOptions}
            onValueChange={(value) => setInfoFormat(value as EntryInfoFormat)}
            ariaLabel="Formato de información"
          />
          <small className="field-help">
            <CircleHelp size={14} />
            El formato queda fijado al añadir el primer registro.
          </small>
        </div>
        {infoFormat === "number" ? (
          <div className="field">
            <span>Orden de la cantidad</span>
            <SelectField
              name="numberSortOrder"
              value={numberOrder}
              options={numberOrderOptions}
              onValueChange={(value) => setNumberOrder(value as NumberSortOrder)}
              ariaLabel="Orden numérico"
            />
          </div>
        ) : (
          <input type="hidden" name="numberSortOrder" value={numberOrder} />
        )}
        <label className="field">
          <span>Puntos máximos</span>
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
          <span>Fecha prevista de cierre</span>
          <input name="scheduledCloseDate" type="date" />
          <small className="field-help">
            <CircleHelp size={14} />
            Es informativa y podrás cambiarla después.
          </small>
        </label>
        {state.message ? (
          <p className={state.ok ? "form-message success" : "form-message error"}>
            {state.message}
          </p>
        ) : null}
        <button className="primary-button create-submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={19} /> : null}
          {pending ? "Creando…" : "Crear tabla"}
          {!pending ? <ArrowRight size={19} /> : null}
        </button>
      </section>
    </form>
  );
}
