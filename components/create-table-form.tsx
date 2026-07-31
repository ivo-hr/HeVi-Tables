"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowRight, CircleHelp, LoaderCircle } from "lucide-react";

import { createTableAction } from "@/app/actions/tables";
import {
  DrawingCanvas,
  type DrawingCanvasHandle
} from "@/components/drawing-canvas";
import type { ActionResult, PointSystem } from "@/lib/types";

const systemDescriptions: Record<PointSystem, string> = {
  WtA: "Una única fila gana todos los puntos.",
  Pod: "El primero recibe el máximo; cada posición resta 2.",
  EC: "Asigna manualmente los puntos de cada fila."
};

export function CreateTableForm() {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [system, setSystem] = useState<PointSystem>("WtA");
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
      <section className="form-section canvas-section">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <h2>Hazla vuestra</h2>
            <p>Dibuja una portada. Los trazos se suavizan automáticamente.</p>
          </div>
        </div>
        <DrawingCanvas ref={canvasRef} />
      </section>

      <section className="form-section config-section">
        <div className="section-heading">
          <span className="step-number">02</span>
          <div>
            <h2>Configura el juego</h2>
            <p>Podrás añadir participantes en la siguiente pantalla.</p>
          </div>
        </div>
        <label className="field">
          <span>Nombre de la tabla</span>
          <input
            name="name"
            maxLength={80}
            placeholder="Quiniela del viaje"
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
          <span>Sistema de puntos</span>
          <select
            name="pointSystem"
            value={system}
            onChange={(event) => setSystem(event.target.value as PointSystem)}
          >
            <option value="WtA">Winner takes all</option>
            <option value="Pod">Podio</option>
            <option value="EC">Todo cuenta</option>
          </select>
          <small className="field-help">
            <CircleHelp size={14} />
            {systemDescriptions[system]}
          </small>
        </label>
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
