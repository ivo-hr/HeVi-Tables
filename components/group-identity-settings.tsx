"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Pencil } from "lucide-react";

import { updateGroupIdentityAction } from "@/app/actions/groups";
import { useLanguage } from "@/components/language-provider";
import { groupMarkLength, truncateGroupMark } from "@/lib/group-mark";
import type { ActionResult } from "@/lib/types";

export function GroupIdentitySettings({
  groupId,
  initialMark,
  toneClass
}: {
  groupId: string;
  initialMark: string;
  toneClass: string;
}) {
  const { t } = useLanguage();
  const [mark, setMark] = useState(initialMark);
  const [savedMark, setSavedMark] = useState(initialMark);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  return (
    <div className="group-mark-owner">
      <div
        className={`group-large-mark ${toneClass}`}
        data-mark-length={groupMarkLength(savedMark)}
        aria-hidden="true"
      >
        {savedMark}
      </div>
      <details className="group-mark-settings">
      <summary>
        <Pencil size={13} /> {t("Cambiar siglas", "Change mark")}
      </summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData();
          formData.set("group_id", groupId);
          formData.set("mark", mark);
          startTransition(async () => {
            const result = await updateGroupIdentityAction(formData);
            setState(result);
            if (result.ok) setSavedMark(mark);
          });
        }}
      >
        <label>
          <span className="visually-hidden">{t("Hasta tres símbolos del grupo", "Up to three group symbols")}</span>
          <input
            value={mark}
            onChange={(event) => setMark(truncateGroupMark(event.currentTarget.value))}
            autoComplete="off"
            spellCheck={false}
            aria-label={t("Hasta tres símbolos del grupo", "Up to three group symbols")}
            required
          />
        </label>
        <button type="submit" disabled={pending} aria-label={t("Guardar siglas", "Save group mark")}>
          {pending ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
          {t("Guardar", "Save")}
        </button>
      </form>
      {state.message ? (
        <small className={state.ok ? "success-text" : "field-error"}>{state.message}</small>
      ) : null}
      </details>
    </div>
  );
}
