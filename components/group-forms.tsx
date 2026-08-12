"use client";

import { useState, useTransition } from "react";
import { ArrowRight, KeyRound, LoaderCircle, Plus, UsersRound } from "lucide-react";

import {
  createGroupAction,
  joinGroupAction
} from "@/app/actions/groups";
import { useLanguage } from "@/components/language-provider";
import { truncateGroupMark } from "@/lib/group-mark";
import type { ActionResult } from "@/lib/types";

type GroupFormProps = {
  mode: "create" | "join";
};

export function GroupForm({ mode }: GroupFormProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();
  const creating = mode === "create";
  const [mark, setMark] = useState("");
  const [customMark, setCustomMark] = useState(false);

  const suggestedMark = (name: string) =>
    truncateGroupMark(name.replace(/[^\p{L}\p{N}]/gu, ""));

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
        <span className="eyebrow">{creating ? t("Nuevo espacio", "New space") : t("Tengo un código", "I have a code")}</span>
        <h2>{creating ? t("Crear un grupo", "Create a group") : t("Entrar con código", "Join with a code")}</h2>
        <p>
          {creating
            ? t("Tú compartes el código y decides cuándo renovarlo.", "You share the code and decide when to rotate it.")
            : t("Pega el código que te haya enviado alguien del grupo.", "Paste the code sent by someone in the group.")}
        </p>
      </div>
      {creating ? (
        <div className="group-create-fields">
          <label className="field group-action-field">
            <span>{t("Nombre del grupo", "Group name")}</span>
            <input
              name="name"
              maxLength={80}
              placeholder={t("Los del viaje", "The trip crew")}
              autoComplete="off"
              onChange={(event) => {
                if (!customMark) setMark(suggestedMark(event.currentTarget.value));
              }}
              required
            />
          </label>
          <label className="field group-mark-field">
            <span>{t("Hasta 3 símbolos", "Up to 3 symbols")}</span>
            <input
              name="mark"
              value={mark}
              placeholder="LV🔥"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setCustomMark(true);
                setMark(truncateGroupMark(event.currentTarget.value));
              }}
              aria-label={t("Hasta tres símbolos del grupo", "Up to three group symbols")}
              required
            />
          </label>
        </div>
      ) : (
        <label className="field group-action-field">
          <span>{t("Código de invitación", "Invite code")}</span>
          <input
            name="code"
            maxLength={14}
            placeholder="A1B2C3D4E5"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
      )}
      {state.message ? <p className="form-message error">{state.message}</p> : null}
      <button className={creating ? "primary-button" : "secondary-button"} disabled={pending}>
        {pending ? <LoaderCircle className="spin" size={18} /> : creating ? <Plus size={18} /> : null}
        {pending ? t("Un momento…", "One moment…") : creating ? t("Crear grupo", "Create group") : t("Entrar al grupo", "Join group")}
        {!pending && !creating ? <ArrowRight size={18} /> : null}
      </button>
    </form>
  );
}
