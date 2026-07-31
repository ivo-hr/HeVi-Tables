"use client";

import { useState, useTransition } from "react";
import { ArrowRight, KeyRound, LoaderCircle, Plus, UsersRound } from "lucide-react";

import {
  createGroupAction,
  joinGroupAction
} from "@/app/actions/groups";
import type { ActionResult } from "@/lib/types";

type GroupFormProps = {
  mode: "create" | "join";
};

export function GroupForm({ mode }: GroupFormProps) {
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();
  const creating = mode === "create";

  return (
    <form
      id={creating ? "nuevo-grupo" : "unirse-grupo"}
      className={`group-action-card ${creating ? "create-group-card" : "join-group-card"}`}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = creating
            ? await createGroupAction(formData)
            : await joinGroupAction(formData);
          setState(result);
        });
      }}
    >
      <span className="group-action-icon">
        {creating ? <UsersRound size={22} /> : <KeyRound size={22} />}
      </span>
      <div>
        <span className="eyebrow">{creating ? "Nuevo espacio" : "Tengo un código"}</span>
        <h2>{creating ? "Crear un grupo" : "Entrar con código"}</h2>
        <p>
          {creating
            ? "Tú compartes el código y decides cuándo renovarlo."
            : "Pega el código que te haya enviado alguien del grupo."}
        </p>
      </div>
      <label className="field group-action-field">
        <span>{creating ? "Nombre del grupo" : "Código de invitación"}</span>
        <input
          name={creating ? "name" : "code"}
          maxLength={creating ? 80 : 14}
          placeholder={creating ? "Los del viaje" : "A1B2C3D4E5"}
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>
      {state.message ? <p className="form-message error">{state.message}</p> : null}
      <button className={creating ? "primary-button" : "secondary-button"} disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={18} /> : creating ? <Plus size={18} /> : null}
        {pending ? "Un momento…" : creating ? "Crear grupo" : "Entrar al grupo"}
        {!pending && !creating ? <ArrowRight size={18} /> : null}
      </button>
    </form>
  );
}
