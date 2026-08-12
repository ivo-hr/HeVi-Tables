"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Monitor, Moon, Palette, Save, Sun } from "lucide-react";

import { updateAppearanceAction } from "@/app/actions/preferences";
import { useLanguage } from "@/components/language-provider";
import { applyAppearance } from "@/components/theme-controller";
import type {
  AccentColor,
  ActionResult,
  ThemePreference
} from "@/lib/types";

const themes: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor }
];

const accents: Array<{ value: AccentColor; label: string; color: string }> = [
  { value: "emerald", label: "Esmeralda", color: "#118b67" },
  { value: "blue", label: "Azul", color: "#356fd1" },
  { value: "violet", label: "Violeta", color: "#7957c8" },
  { value: "orange", label: "Naranja", color: "#c96b24" },
  { value: "rose", label: "Rosa", color: "#c14f72" }
];

export function AppearanceSettings({
  initialTheme,
  initialAccent
}: {
  initialTheme: ThemePreference;
  initialAccent: AccentColor;
}) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState(initialTheme);
  const [accent, setAccent] = useState(initialAccent);
  const [state, setState] = useState<ActionResult>({ ok: false });
  const [pending, startTransition] = useTransition();

  const preview = (nextTheme: ThemePreference, nextAccent: AccentColor) => {
    setTheme(nextTheme);
    setAccent(nextAccent);
    applyAppearance(nextTheme, nextAccent);
    setState({ ok: false });
  };

  return (
    <section className="appearance-card">
      <div className="appearance-heading">
        <span className="settings-block-icon">
          <Palette size={19} />
        </span>
        <div>
          <span className="eyebrow">{t("Apariencia", "Appearance")}</span>
          <h2>{t("Que no parezca el mismo sitio", "Make it look like your place")}</h2>
          <p>{t("Elige cómo quieres verlo. No mejora tus resultados, pero algo hace.", "Choose how it looks. It will not improve your results, but it does something.")}</p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData();
          formData.set("theme", theme);
          formData.set("accent", accent);
          startTransition(async () => setState(await updateAppearanceAction(formData)));
        }}
      >
        <fieldset className="appearance-options">
          <legend>{t("Tema", "Theme")}</legend>
          <div className="theme-options">
            {themes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={theme === item.value ? "active" : undefined}
                  onClick={() => preview(item.value, accent)}
                  aria-pressed={theme === item.value}
                >
                  <Icon size={19} />
                  {item.value === "light" ? t("Claro", "Light") : item.value === "dark" ? t("Oscuro", "Dark") : t("Sistema", "System")}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="appearance-options">
          <legend>{t("Color principal", "Accent colour")}</legend>
          <div className="accent-options">
            {accents.map((item) => (
              <button
                key={item.value}
                type="button"
                className={accent === item.value ? "active" : undefined}
                onClick={() => preview(theme, item.value)}
                aria-label={item.value === "emerald" ? t("Esmeralda", "Emerald") : item.value === "blue" ? t("Azul", "Blue") : item.value === "violet" ? t("Violeta", "Violet") : item.value === "orange" ? t("Naranja", "Orange") : t("Rosa", "Rose")}
                aria-pressed={accent === item.value}
                title={item.value === "emerald" ? t("Esmeralda", "Emerald") : item.value === "blue" ? t("Azul", "Blue") : item.value === "violet" ? t("Violeta", "Violet") : item.value === "orange" ? t("Naranja", "Orange") : t("Rosa", "Rose")}
              >
                <span style={{ backgroundColor: item.color }} />
              </button>
            ))}
          </div>
        </fieldset>
        {state.message ? (
          <p className={state.ok ? "form-message success" : "form-message error"}>
            {state.message}
          </p>
        ) : null}
        <button className="primary-button" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
          {pending ? t("Guardando…", "Saving…") : t("Guardar apariencia", "Save appearance")}
        </button>
      </form>
    </section>
  );
}
