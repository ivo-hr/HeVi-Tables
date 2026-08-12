"use client";

import { Check, Globe2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateLanguageAction } from "@/app/actions/preferences";
import { useLanguage } from "@/components/language-provider";
import type { ActionResult } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n";

const languages: Array<{ value: AppLocale; nativeLabel: string; detail: string }> = [
  { value: "es", nativeLabel: "Español", detail: "Interfaz en español" },
  { value: "en", nativeLabel: "English", detail: "Interface in English" }
];

export function LanguageSettings() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState(locale);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  const save = (nextLocale: AppLocale) => {
    setSelected(nextLocale);
    setState({ ok: false });
    const formData = new FormData();
    formData.set("locale", nextLocale);
    startTransition(async () => {
      const result = await updateLanguageAction(formData);
      setState(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <section className="appearance-card language-card">
      <div className="appearance-heading">
        <span className="settings-block-icon">
          <Globe2 size={19} />
        </span>
        <div>
          <span className="eyebrow">{t("Idioma", "Language")}</span>
          <h2>{t("Elige cómo habla HeVi", "Choose how HeVi speaks")}</h2>
          <p>
            {t(
              "Se guarda en tu cuenta y también en este navegador.",
              "It is saved to your account and in this browser."
            )}
          </p>
        </div>
      </div>
      <div className="language-options" role="radiogroup" aria-label={t("Idioma de la aplicación", "Application language")}>
        {languages.map((language) => (
          <button
            key={language.value}
            type="button"
            role="radio"
            aria-checked={selected === language.value}
            className={selected === language.value ? "active" : undefined}
            disabled={pending}
            onClick={() => save(language.value)}
          >
            <span>
              <strong>{language.nativeLabel}</strong>
              <small>{language.detail}</small>
            </span>
            {pending && selected === language.value ? (
              <LoaderCircle className="spin" size={18} />
            ) : selected === language.value ? (
              <Check size={18} />
            ) : null}
          </button>
        ))}
      </div>
      {state.message ? (
        <p className={state.ok ? "form-message success" : "form-message error"}>
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
