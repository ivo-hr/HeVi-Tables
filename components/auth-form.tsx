"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  AtSign,
  LoaderCircle,
  LockKeyhole,
  UserRound
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { syncLanguagePreferenceAction } from "@/app/actions/preferences";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function AuthForm() {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState<string | undefined>(authError ?? undefined);
  const [isError, setIsError] = useState(Boolean(authError));
  const [pending, startTransition] = useTransition();
  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("locale", locale);
    const next = safeNextPath(searchParams.get("next"));
    if (next !== "/") url.searchParams.set("next", next);
    return url.toString();
  };

  return (
    <div className="auth-panel">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : undefined}
          onClick={() => {
            setMode("login");
            setMessage(undefined);
          }}
        >
          {t("Entrar", "Sign in")}
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : undefined}
          onClick={() => {
            setMode("signup");
            setMessage(undefined);
          }}
        >
          {t("Crear cuenta", "Create account")}
        </button>
      </div>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const email = String(formData.get("email") ?? "");
          const password = String(formData.get("password") ?? "");
          const username = String(formData.get("username") ?? "");
          setMessage(undefined);

          startTransition(async () => {
            try {
              const supabase = createClient();
              if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
                });
                if (error) throw error;
                await syncLanguagePreferenceAction();
                router.replace(safeNextPath(searchParams.get("next")));
                router.refresh();
                return;
              }

              const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                  data: { username, locale },
                  emailRedirectTo: callbackUrl()
                }
              });
              if (error) throw error;

              setIsError(false);
              if (data.session) {
                router.replace("/");
                router.refresh();
              } else {
                setMessage(
                  t("Cuenta creada. Revisa tu email para confirmar el acceso.", "Account created. Check your email to confirm access.")
                );
              }
            } catch (error) {
              setIsError(true);
              setMessage(
                error instanceof Error
                  ? error.message
                  : t("No se pudo completar el acceso.", "Sign-in could not be completed.")
              );
            }
          });
        }}
      >
        {mode === "signup" ? (
          <label className="field icon-field">
            <span>{t("Nombre visible", "Display name")}</span>
            <div>
              <UserRound size={18} />
              <input
                name="username"
                minLength={1}
                maxLength={30}
                placeholder={t("Cómo te llamamos", "What should we call you?")}
                autoComplete="nickname"
                required
              />
            </div>
          </label>
        ) : null}
        <label className="field icon-field">
          <span>Email</span>
          <div>
            <AtSign size={18} />
            <input
              name="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>
        </label>
        <label className="field icon-field">
          <span>{t("Contraseña", "Password")}</span>
          <div>
            <LockKeyhole size={18} />
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              placeholder={t("Mínimo 8 caracteres", "At least 8 characters")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </div>
        </label>
        {message ? (
          <p className={isError ? "form-message error" : "form-message success"}>
            {message}
          </p>
        ) : null}
        <button className="primary-button auth-submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} /> : null}
          {pending ? t("Un momento…", "One moment…") : mode === "login" ? t("Entrar", "Sign in") : t("Crear cuenta", "Create account")}
          {!pending ? <ArrowRight size={18} /> : null}
        </button>
      </form>

      <div className="auth-divider">
        <span>{t("o continúa con", "or continue with")}</span>
      </div>
      <button
        type="button"
        className="oauth-button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: callbackUrl()
              }
            });
            if (error) {
              setIsError(true);
              setMessage(error.message);
            }
          });
        }}
      >
        <span className="google-mark" aria-hidden="true">
          G
        </span>
        Google
      </button>
    </div>
  );
}
